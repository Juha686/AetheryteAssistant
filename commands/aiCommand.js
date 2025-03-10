const OpenAI = require('openai');
const baseCommand = require('./baseCommand.js');
const ThreadHandler = require('./handlers/threadHandler');
const { initializeModules } = require('./functions/functionMap');
const { functionMap, getFunctionDefinitions } = require('./functions/functionMap');

class AICommand extends baseCommand {
    static TIMEOUT_MS = 300000; // 1 minute timeout
    static CHECK_INTERVAL_MS = 500; // Check every 500ms

    constructor(client) {
        super(client);
        this.openai = null;
        this.assistantId = null;
        this.threadHandler = null;
    }

    async initializeOpenAI() {
        if (!this.openai) {
            this.openai = new OpenAI({ apiKey: process.env.CHATGPT_API });
            initializeModules({ openai: this.openai });
            this.threadHandler = new ThreadHandler(this.openai, this.userRepository);
        }
    }

    async initialize() {
        await this.initializeOpenAI();
        
        if (!this.assistantId) {
            const assistantConfig = await this.configRepository.fetch(this.assistantConfigKey);
            
            if (assistantConfig && assistantConfig.id) {
                this.assistantId = assistantConfig.id;
                
                try {
                    const existingAssistant = await this.openai.beta.assistants.retrieve(this.assistantId);
                    const currentTools = this.getTools();
                    const currentInstructions = this.getInstructions();
                    
                    // Check if instructions have changed
                    const instructionsChanged = currentInstructions !== existingAssistant.instructions;
                    
                    const normalizeTools = (tools) => {
                        return tools.map(tool => ({
                            type: tool.type,
                            function: tool.function ? {
                                name: tool.function.name,
                                description: tool.function.description,
                                parameters: tool.function.parameters
                            } : undefined
                        })).sort((a, b) => {
                            if (a.type !== b.type) return a.type.localeCompare(b.type);
                            return (a.function?.name || '').localeCompare(b.function?.name || '');
                        });
                    };

                    const normalizedCurrent = normalizeTools(currentTools);
                    const normalizedExisting = normalizeTools(existingAssistant.tools);
                    const toolsChanged = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedExisting);
                    
                    if (toolsChanged || instructionsChanged) {
                        console.log('Assistant configuration changed, regenerating assistant...');
                        if (toolsChanged) console.log('Tools configuration changed');
                        if (instructionsChanged) console.log('Instructions changed');
                        
                        await this.openai.beta.assistants.del(this.assistantId);
                        this.assistantId = null;
                        await this.configRepository.remove(this.assistantConfigKey);
                    }
                } catch (error) {
                    console.error('Error checking assistant:', error);
                    this.assistantId = null;
                    await this.configRepository.remove(this.assistantConfigKey);
                }
            }
            
            if (!this.assistantId) {
                const assistant = await this.openai.beta.assistants.create({
                    name: this.assistantName,
                    instructions: this.getInstructions(),
                    model: this.getModel(),
                    tools: this.getTools(),
                    temperature: this.getTemperature()
                });
                
                this.assistantId = assistant.id;
                await this.configRepository.save(this.assistantConfigKey, { id: assistant.id });
            }
        }
    }

    async waitForRun(threadId, runId, startTime) {
        while (Date.now() - startTime < AICommand.TIMEOUT_MS) {
            const runStatus = await this.openai.beta.threads.runs.retrieve(threadId, runId);

            if (runStatus.status === 'requires_action') {
                await this.handleFunctionCall(
                    threadId,
                    runId,
                    runStatus.required_action.submit_tool_outputs.tool_calls
                );
            } else if (runStatus.status === 'failed') {
                throw new Error('Assistant run failed');
            } else if (runStatus.status === 'completed') {
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, AICommand.CHECK_INTERVAL_MS));
        }
        return false;
    }

    async execute(interaction) {
        await interaction.deferReply();
        await this.initialize();
        this.interaction = interaction;
    
        try {
            const hasPremium = this.checkEntitlements(interaction);
            const query = interaction.options.getString('message');
            const threadId = await this.threadHandler.getThread(
                interaction.user.id,
                this.assistantConfigKey
            );

            // Check for active runs first
            try {
                const runs = await this.openai.beta.threads.runs.list(threadId);
                const activeRun = runs.data.find(run => 
                    ['queued', 'in_progress', 'requires_action'].includes(run.status)
                );

                if (activeRun) {
                    console.log(`Found active run ${activeRun.id} with status ${activeRun.status}`);
                    const startTime = Date.now();
                    const completed = await this.waitForRun(threadId, activeRun.id, startTime);
                    
                    if (!completed) {
                        await interaction.editReply('Previous request timed out. Please try again.');
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking active runs:', error);
            }

            // Create new message and run
            await this.openai.beta.threads.messages.create(
                threadId,
                { role: "user", content: query }
            );

            const run = await this.openai.beta.threads.runs.create(
                threadId,
                { 
                    assistant_id: this.assistantId,
                    model: hasPremium ? this.getModel() : this.getNonPremiumModel(),
                    additional_instructions: hasPremium 
                        ? "The user has premium access. All features are available."
                        : "The user does not have premium access. Image generation may be restricted."
                }
            );

            const startTime = Date.now();
            const completed = await this.waitForRun(threadId, run.id, startTime);

            if (!completed) {
                throw new Error('Request timed out. Please try again.');
            }

            const messages = await this.openai.beta.threads.messages.list(threadId);
            const latestMessage = messages.data[0];
            
            for (const content of latestMessage.content) {
                await this.threadHandler.processContent(content, interaction);
            }

        } catch (error) {
            console.error('Error:', error);
            await this.handleOpenAIError(interaction, error);
        }
    }

    
    async handleOpenAIError(interaction, error) {
        await interaction.editReply({
            content: 'Received error from OpenAI, you can retry the request or if the issue persists please contact us through the support discord found on my profile!',
            ephemeral: true,
        });

        if (error.response) {
            if (error.response.status === 400) {
                const errorMessage = error.response.data?.error?.message || '';
                
                // Check for the specific error about active runs
                if (errorMessage.includes("Can't add messages") && errorMessage.includes("while a run")) {
                    try {
                        // Extract run ID from error message using regex
                        const runIdMatch = errorMessage.match(/run_([\w]+)/);
                        const threadIdMatch = errorMessage.match(/thread_([\w]+)/);
                        
                        if (runIdMatch && threadIdMatch) {
                            const runId = runIdMatch[0];
                            const threadId = threadIdMatch[0];
                            
                            console.log(`Attempting to cancel run ${runId} on thread ${threadId}`);
                            
                            // Cancel the active run
                            await this.openai.beta.threads.runs.cancel(threadId, runId);
                            
                            await interaction.followUp({
                                content: 'Previous request was still processing. I\'ve cancelled it - please try your request again.',
                                ephemeral: true,
                            });
                            return;
                        }
                    } catch (cancelError) {
                        console.error('Error cancelling run:', cancelError);
                    }
                } else {
                    await interaction.followUp({
                        content: 'Your chat might be exceeding the models maximum conversation length! Use the /reset command to start over.',
                        ephemeral: true,
                    });
                }
                
                console.log(error.response.status);
                console.log(error.response.data);
            }
        } else {
            console.log(error.message);
        }
    }

    async handleFunctionCall(threadId, runId, toolCalls) {
        const outputs = [];
        for (const toolCall of toolCalls) {
            console.log('Tool call:', toolCall);
            if (toolCall.type === 'function') {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                
                // Log premium check details
                console.log('Checking premium status for function:', functionName);
                const functionDefinitions = getFunctionDefinitions(true);
                const funcDef = functionDefinitions.find(f => 
                    f.function && f.function.name === functionName
                );
                const hasPremium = this.checkEntitlements(this.interaction);

                if (funcDef?.options?.isPremium && !hasPremium) {
                    console.log('Premium check failed, blocking function call');
                    outputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify({
                            error: "This is a premium feature. Please upgrade to access this functionality.",
                            isPremiumError: true
                        })
                    });
                    continue;
                }

                const func = functionMap[functionName];
                if (!func) {
                    console.log(`Function not found: ${functionName}`);
                    outputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify({
                            error: `I apologize, but the ${functionName} function is not currently available.`,
                            unavailableFunction: true
                        })
                    });
                    continue;
                }
                
                try {
                    const result = await func(this.interaction, functionArgs);
                    outputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(result)
                    });
                } catch (error) {
                    console.error(`Error executing function ${functionName}:`, error);
                    outputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify({
                            error: `An error occurred while processing your request: ${error.message}`,
                            isError: true
                        })
                    });
                }
            }
        }

        await this.openai.beta.threads.runs.submitToolOutputs(
            threadId,
            runId,
            { tool_outputs: outputs }
        );
    }
    
    getNonPremiumModel() {
        return 'gpt-4o-mini';
    }

    getTemperature() {
        return 0.7; 
    }

    // Methods to be implemented by child classes
    getTools() {
        throw new Error('getTools must be implemented by child class');
    }

    getInstructions() {
        throw new Error('getInstructions must be implemented by child class');
    }

    getModel() {
        throw new Error('getModel must be implemented by child class');
    }

    get assistantName() {
        throw new Error('assistantName must be implemented by child class');
    }

    get assistantConfigKey() {
        throw new Error('assistantConfigKey must be implemented by child class');
    }
}

module.exports = AICommand;