const mapUserLanguage = function(languageString) {
	let language_string = '';
	switch (languageString) {
		case 'English':
			language_string = 'EN_Name';
			break;
		case 'German':
			language_string = 'DE_Name';
			break;
		case 'Japanese':
			language_string = 'JA_Name';
			break;
		case 'French':
			language_string = 'FR_Name';
			break;

		default:
			language_string = 'EN_Name';
			break;
	}
	return language_string;
};

module.exports = { mapUserLanguage };