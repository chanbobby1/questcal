
$(document).ready(function () {

  $('head').append($('<link rel="stylesheet" type="text/css" />').attr('href', chrome.extension.getURL('bootstrap.min.css')));
  $.getScript(chrome.extension.getURL('jquery.js'), function(){});
  $.getScript(chrome.extension.getURL('uwquestcal_lib.js'), function(){});
  $.getScript(chrome.extension.getURL('moment.min.js'), function(){});
  $.getScript("https://apis.google.com/js/client.js?onload=loadedGAPI", function(){});
});
