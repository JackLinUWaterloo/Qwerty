var server = require("./server");
var router = require("./router");
var authHelper = require("./authHelper");
var outlook = require("node-outlook");

var handle = {};
handle["/"] = home;
handle["/authorize"] = authorize;
handle["/mail"] = mail;
handle["/calendar"] = calendar;
handle["/contacts"] = contacts;

server.start(router.route, handle);

function home(response, request) {
  console.log("Request handler 'home' was called.");
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write('<p>Please <a href="' + authHelper.getAuthUrl() + '">sign in</a> with your Office 365 or Outlook.com account.</p>');
  response.end();
}

var url = require("url");
function authorize(response, request) {
  console.log("Request handler 'authorize' was called.");

  // The authorization code is passed as a query parameter
  var url_parts = url.parse(request.url, true);
  var code = url_parts.query.code;
  console.log("Code: " + code);
  authHelper.getTokenFromCode(code, tokenReceived, response);
}

function tokenReceived(response, error, token) {
  if (error) {
    console.log("Access token error: ", error.message);
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write('<p>ERROR: ' + error + '</p>');
    response.end();
  }
  else {
    var cookies = ['qwerty-token=' + token.token.access_token + ';Max-Age=3600',
                   'qwerty-email=' + authHelper.getEmailFromIdToken(token.token.id_token) + ';Max-Age=3600'];
    response.setHeader('Set-Cookie', cookies);
    response.writeHead(302, {'Location': 'http://localhost:8000/mail'});
    response.end();
  }
}

function getValueFromCookie(valueName, cookie) {
  if (cookie.indexOf(valueName) !== -1) {
    var start = cookie.indexOf(valueName) + valueName.length + 1;
    var end = cookie.indexOf(';', start);
    end = end === -1 ? cookie.length : end;
    return cookie.substring(start, end);
  }
}

function mail(response, request) {
  var token = getValueFromCookie('qwerty-token', request.headers.cookie);
  console.log("Token found in cookie: ", token);
  var email = getValueFromCookie('qwerty-email', request.headers.cookie);
  console.log("Email found in cookie: ", email);
  if (token) {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write('<div><h1>Your inbox</h1></div>');

    var queryParams = {
      '$select': 'Subject,ReceivedDateTime,From',
      '$orderby': 'ReceivedDateTime desc',
      '$top': 10
    };

    // Set the API endpoint to use the v2.0 endpoint
    outlook.base.setApiEndpoint('https://outlook.office.com/api/v2.0');
    // Set the anchor mailbox to the user's SMTP address
    outlook.base.setAnchorMailbox(email);

    outlook.mail.getMessages({token: token, odataParams: queryParams},
      function(error, result){
        if (error) {
          console.log('getMessages returned an error: ' + error);
          response.write("<p>ERROR: " + error + "</p>");
          response.end();
        }
        else if (result) {
          console.log('getMessages returned ' + result.value.length + ' messages.');
          response.write('<table><tr><th>From</th><th>Subject</th><th>Received</th></tr>');
          result.value.forEach(function(message) {
            console.log('  Subject: ' + message.Subject);
            var from = message.From ? message.From.EmailAddress.Name : "NONE";
            response.write('<tr><td>' + from +
              '</td><td>' + message.Subject +
              '</td><td>' + message.ReceivedDateTime.toString() + '</td></tr>');
          });

          response.write('</table>');
          response.end();
        }
      });
  }
  else {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write('<p> No token found in cookie!</p>');
    response.end();
  }
}

function calendar(response, request) {
  var token = getValueFromCookie('qwerty-token', request.headers.cookie);
  console.log("Token found in cookie: ", token);
  var email = getValueFromCookie('qwerty-email', request.headers.cookie);
  console.log("Email found in cookie: ", email);
  if (token) {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write('<div><h1>Your calendar</h1></div>');

    var queryParams = {
      '$select': 'Subject,Start,End',
      '$orderby': 'Start/DateTime desc',
      '$top': 10
    };

    // Set the API endpoint to use the v2.0 endpoint
    outlook.base.setApiEndpoint('https://outlook.office.com/api/v2.0');
    // Set the anchor mailbox to the user's SMTP address
    outlook.base.setAnchorMailbox(email);
    // Set the preferred time zone.
    // The API will return event date/times in this time zone.
    outlook.base.setPreferredTimeZone('Eastern Standard Time');

    outlook.calendar.getEvents({token: token, odataParams: queryParams},
      function(error, result){
        if (error) {
          console.log('getEvents returned an error: ' + error);
          response.write("<p>ERROR: " + error + "</p>");
          response.end();
        }
        else if (result) {
          console.log('getEvents returned ' + result.value.length + ' events.');
          response.write('<table><tr><th>Subject</th><th>Start</th><th>End</th></tr>');
          result.value.forEach(function(event) {
            console.log('  Subject: ' + event.Subject);
            response.write('<tr><td>' + event.Subject +
              '</td><td>' + event.Start.DateTime.toString() +
              '</td><td>' + event.End.DateTime.toString() + '</td></tr>');
          });

          response.write('</table>');
          response.end();
        }
      });
  }
  else {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write('<p> No token found in cookie!</p>');
    response.end();
  }
}

function contacts(response, request) {
  var token = getValueFromCookie('qwerty-token', request.headers.cookie);
  console.log("Token found in cookie: ", token);
  var email = getValueFromCookie('qwerty-email', request.headers.cookie);
  console.log("Email found in cookie: ", email);
  if (token) {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write('<div><h1>Your contacts</h1></div>');

    var queryParams = {
      '$select': 'GivenName,Surname,EmailAddresses',
      '$orderby': 'GivenName asc',
      '$top': 10
    };

    // Set the API endpoint to use the v2.0 endpoint
    outlook.base.setApiEndpoint('https://outlook.office.com/api/v2.0');
    // Set the anchor mailbox to the user's SMTP address
    outlook.base.setAnchorMailbox(email);

    outlook.contacts.getContacts({token: token, odataParams: queryParams},
      function(error, result){
        if (error) {
          console.log('getContacts returned an error: ' + error);
          response.write("<p>ERROR: " + error + "</p>");
          response.end();
        }
        else if (result) {
          console.log('getContacts returned ' + result.value.length + ' contacts.');
          response.write('<table><tr><th>First name</th><th>Last name</th><th>Email</th></tr>');
          result.value.forEach(function(contact) {
            var email = contact.EmailAddresses[0] ? contact.EmailAddresses[0].Address : "NONE";
            response.write('<tr><td>' + contact.GivenName +
              '</td><td>' + contact.Surname +
              '</td><td>' + email + '</td></tr>');
          });

          response.write('</table>');
          response.end();
        }
      });
  }
  else {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write('<p> No token found in cookie!</p>');
    response.end();
  }
}