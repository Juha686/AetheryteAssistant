/* eslint-disable no-inline-comments */
const { registerFont, loadImage, createCanvas } = require('canvas');
registerFont('/usr/src/bot/assets/NotoSansSC-Regular.otf', { family: 'Noto Sans SC' });
registerFont('/usr/src/bot/assets/Roboto-Regular.ttf', { family: 'Roboto' });


function numberWithCommas(x) {
	return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ' ');
}

function time_ago(time) {
	switch (typeof time) {
		case 'number':
			break;
		case 'string':
			time = +new Date(time);
			break;
		case 'object':
			if (time.constructor === Date) time = time.getTime();
			break;
		default:
			time = +new Date();
	}
	const time_formats = [
		[60, 'seconds', 1], // 60
		[120, '1 minute ago', '1 minute from now'], // 60*2
		[3600, 'minutes', 60], // 60*60, 60
		[7200, '1 hour ago', '1 hour from now'], // 60*60*2
		[86400, 'hours', 3600], // 60*60*24, 60*60
		[172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
		[604800, 'days', 86400], // 60*60*24*7, 60*60*24
		[1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
		[2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
		[4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
		[29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
		[58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
		[2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
		[5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
		[58060800000, 'centuries', 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
	];
	let seconds = (+new Date() - time) / 1000,
		token = 'ago',
		list_choice = 1;

	if (seconds == 0) {
		return 'Just now';
	}
	if (seconds < 0) {
		seconds = Math.abs(seconds);
		token = 'from now';
		list_choice = 2;
	}
	let i = 0,
		format;
	// eslint-disable-next-line no-cond-assign
	while (format = time_formats[i++]) {
		if (seconds < format[0]) {
			if (typeof format[2] == 'string') {return format[list_choice];}
			else {return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;}
		}
	}
	return time;
}

const drawMarketboard = async function(rowArray) {
	const image = await loadImage('/usr/src/bot/assets/table_toprow_gradient.png');
	const hqImage = await loadImage('/usr/src/bot/assets/hq.png');
	console.time('imagedraw');
	console.time('canvasfill');
	console.time('canvascreate');
	console.time('canvascontext');
	const width = 877;
	const height = 595;
	const canvas = createCanvas(width, height);
	console.timeEnd('canvascreate');
	const context = canvas.getContext('2d');
	console.timeEnd('canvascontext');
	context.drawImage(image, 0, 0, 877, 595);
	console.timeEnd('canvasfill');
	context.textBaseline = 'top';
	context.textAlign = 'center';
	context.font = '18pt Roboto, \'Noto Sans SC\'';
	context.fillStyle = '#ffffff';
	const upDownOffset = 55;
	for (let i = 0; i < rowArray.length; i++) {
		let leftToRightOffset = 46;
		context.fillStyle = '#ffffff';
		context.fillText(i, leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 136;
		context.fillText(rowArray[i].worldName, leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 150;
		if (rowArray[i].hq == true) {
			context.drawImage(hqImage, leftToRightOffset - 8, 60 + (i * upDownOffset), 16, 16);
		}
		// context.fillText(hq, leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 138;
		context.fillStyle = '#dddc87';
		context.fillText(numberWithCommas(rowArray[i].pricePerUnit), leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 154;
		context.fillStyle = '#ffffff';
		context.fillText(numberWithCommas(rowArray[i].quantity), leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 154;
		context.fillStyle = '#afffa1';
		context.fillText(numberWithCommas(rowArray[i].total), leftToRightOffset, 60 + (i * upDownOffset));
	}
	// offsets for the columns: 46, 46 + 89, 89 + 50, 51 + 92, 92 + 60, 61 + 93
	// 46, + 135, + 141, + 143, + 152, + 154
	const resultImgBuffer = canvas.toBuffer('image/png');
	console.timeEnd('imagedraw');
	return resultImgBuffer;
};

const drawHistory = async function(rowArray) {
	const image = await loadImage('/usr/src/bot/assets/table_toprow_gradient_history.png');
	const hqImage = await loadImage('/usr/src/bot/assets/hq.png');
	console.time('imagedraw');
	console.time('canvasfill');
	console.time('canvascreate');
	console.time('canvascontext');
	const width = 877;
	const height = 595;
	const canvas = createCanvas(width, height);
	console.timeEnd('canvascreate');
	const context = canvas.getContext('2d');
	console.timeEnd('canvascontext');
	context.drawImage(image, 0, 0, 877, 595);
	console.timeEnd('canvasfill');
	context.textBaseline = 'top';
	context.textAlign = 'center';
	context.font = '18pt Roboto, \'Noto Sans SC\'';
	context.fillStyle = '#ffffff';
	const upDownOffset = 55;
	for (let i = 0; i < rowArray.length; i++) {
		let leftToRightOffset = 46;
		context.fillStyle = '#ffffff';
		context.fillText(i, leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 136;
		context.fillText(rowArray[i].worldName, leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 150;
		if (rowArray[i].hq == true) {
			context.drawImage(hqImage, leftToRightOffset - 8, 60 + (i * upDownOffset), 16, 16);
		}
		// context.fillText(hq, leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 138;
		context.fillStyle = '#dddc87';
		context.fillText(numberWithCommas(rowArray[i].pricePerUnit), leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 154;
		context.fillStyle = '#ffffff';
		context.fillText(numberWithCommas(rowArray[i].quantity), leftToRightOffset, 60 + (i * upDownOffset));
		leftToRightOffset += 154;
		context.fillStyle = '#afffa1';
		context.fillText(time_ago(rowArray[i].timestamp * 1000), leftToRightOffset, 60 + (i * upDownOffset));
	}
	// offsets for the columns: 46, 46 + 89, 89 + 50, 51 + 92, 92 + 60, 61 + 93
	// 46, + 135, + 141, + 143, + 152, + 154
	const resultImgBuffer = canvas.toBuffer('image/png');
	console.timeEnd('imagedraw');
	return resultImgBuffer;
};

const drawItemSets = async function(items, itemList, language) {
	const image = await loadImage('/usr/src/bot/assets/table_gearsets.png');
	const hqImage = await loadImage('/usr/src/bot/assets/hq.png');
	console.time('imagedraw');
	console.time('canvasfill');
	console.time('canvascreate');
	console.time('canvascontext');
	const width = 757;
	const height = 432;
	const canvas = createCanvas(width, height);
	console.timeEnd('canvascreate');
	const context = canvas.getContext('2d');
	console.timeEnd('canvascontext');
	context.drawImage(image, 0, 0, width, height);
	console.timeEnd('canvasfill');
	context.textBaseline = 'top';
	context.textAlign = 'left';
	context.font = '16pt Roboto, \'Noto Sans SC\'';
	context.fillStyle = '#ffffff';

	/* const gearSlotCoords = [
		{ x: 55, y: 70 },
		{ x: 55, y: 123 },
		{ x: 55, y: 176 },
		{ x: 55, y: 229 },
		{ x: 55, y: 282 },
		{ x: 55, y: 335 },
		{ x: 55, y: 388 },
		{ x: 55, y: 441 },
		{ x: 55, y: 494 },
		{ x: 55, y: 547 },
		{ x: 55, y: 600 },
		{ x: 55, y: 653 },
	];*/
	const gearSlotCoords = [
		{ x: 45, y: 48 },
		{ x: 45, y: 87 },
		{ x: 45, y: 126 },
		{ x: 45, y: 165 },
		{ x: 45, y: 204 },
		{ x: 45, y: 243 },
		{ x: 45, y: 282 },
		{ x: 45, y: 321 },
		{ x: 45, y: 360 },
	];
	const totalLocation = { x: 575, y: 400 };
	
	// Before the for loop, add a slots tracking object
	const usedSlots = {};
	let totalPrice = 0;

	for (let val in items) {
		context.fillStyle = '#ffffff';
		val = items[val];
		if (typeof val.listings[0] == 'undefined') {continue;}
		const dbItem = itemList.find(element => element.ID == val.itemID);
		
		// Add validation for ITEMSLOT
		if (!dbItem || dbItem.ITEMSLOT < 3 || dbItem.ITEMSLOT > 14) {
			console.warn(`Invalid ITEMSLOT for item ${val.itemID}`);
			continue;
		}

		// Adjust ITEMSLOT if needed
		if (dbItem.ITEMSLOT > 5) {
			dbItem.ITEMSLOT -= 1;
		}

		// Ensure index is within bounds and slot isn't already used
		const slotIndex = dbItem.ITEMSLOT - 3;
		if (slotIndex < 0 || slotIndex >= gearSlotCoords.length || usedSlots[slotIndex]) {
			console.warn(`Slot ${slotIndex} already used or out of bounds for item ${val.itemID}`);
			continue;
		}

		// Mark slot as used
		usedSlots[slotIndex] = true;

		let leftToRightOffset = gearSlotCoords[slotIndex].x;
		// Use slotIndex consistently instead of recalculating
		context.fillText(dbItem[language], leftToRightOffset, gearSlotCoords[slotIndex].y);
		leftToRightOffset += 376;
		context.fillText(val.listings[0].worldName, leftToRightOffset, gearSlotCoords[slotIndex].y);
		leftToRightOffset += 152;
		if (val.listings[0].hq == true) {
			context.drawImage(hqImage, leftToRightOffset, gearSlotCoords[slotIndex].y + 3, 16, 16);
		}

		leftToRightOffset += 37;
		context.fillStyle = '#dddc87';
		totalPrice += Number(val.listings[0].pricePerUnit);
		context.fillText(numberWithCommas(val.listings[0].pricePerUnit), leftToRightOffset, gearSlotCoords[slotIndex].y);
	}
	context.fillStyle = '#afffa1';
	context.fillText(numberWithCommas(totalPrice), totalLocation.x, totalLocation.y);

	const resultImgBuffer = canvas.toBuffer('image/png');
	console.timeEnd('imagedraw');
	return resultImgBuffer;
};

module.exports = { drawMarketboard, drawHistory, drawItemSets };