
$(document).ready(function () {
	
	$.getScript(chrome.extension.getURL('jquery.js'), function(){});
	$.getScript(chrome.extension.getURL('uwquestcal_lib.js'), function(){});
	$.getScript("https://apis.google.com/js/client.js?onload=loadedGAPI"), function(){};
});