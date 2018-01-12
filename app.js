
/**
 * Copyright 2017-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `npm install`
 * 3. Update the VERIFY_TOKEN
 * 4. Add your PAGE_ACCESS_TOKEN to your environment vars
 *
 */

'use strict';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  async = require('async'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);


      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender ID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        
        handlePostback(sender_psid, webhook_event.postback);
      }
      
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = "JOKES_BOT";
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// A private function to help ID if the incoming message is a greeting.
// Returns a boolean.
function IsHelloResponse(text){
  var hello_phrases = ["hello", "hi", "hey", "sup", "yo"]
  var is_hello = false;
  for (var i = 0; i < hello_phrases.length; i++){
    if (text.indexOf(hello_phrases[i]) !== -1){
      is_hello = true;
    }
  }

  return is_hello;
}

/* Sends a joke back to the messenger user.
 * We call another API that sends us dad jokes.
 * Because it requires a variable time to receive the joke,
 * we send back an empty response to keep it from timing out.
 * Finally, a callback function is launched with the joke in
 * hand, and is sent to the messenger.
 *
 * We could have the response be a "Read" tag, for better user
 * experience.
 */
function sendJoke(response, sender_psid){
  async.parallel([
      function(callback) {
        // Makes the Dad Joke API call
          // Send the HTTP request to the Messenger Platform
        request({
          "uri": "https://icanhazdadjoke.com/",
          "headers": {
            "Accept": "application/json"
          },
          "method": "GET"
        }, (err, res, body) => {
          if (!err) {
            var bodyObj = JSON.parse(body);
            callback(null, bodyObj["joke"]);
          } else {
            console.error("Couldn't fetch the joke!");
            callback(null, "This bot is a joke - I couldn't even generate a joke!");
          }
        }); 
      },
      function(callback) {
        // Create an empty response, just in case our other API
        // call takes too long and causes a timeout.
        response = {
          "text": ""
        }
        callSendAPI(sender_psid, response);
        callback(null, true);
      }
    ], function(err, results){ // Callback function
        console.log("Joke: " + results[0]);
        response = {
          "text": results[0]
        }
        callSendAPI(sender_psid, response);
  });
}

function handleMessage(sender_psid, received_message) {
  let response;
  
  // Checks if the message contains text
  if (received_message.text) {
    var lowered_text = received_message.text.toLowerCase();    
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    if (IsHelloResponse(lowered_text)){
      response = {
        "text": "Hello right back at ya!"
      }
      callSendAPI(sender_psid, response);
    }
    else if (lowered_text.indexOf("tell me a joke") !== -1){
      sendJoke(response, sender_psid);  
    }
    else if (lowered_text.indexOf("that's funny") !== -1){
      response = {
        "text": "Thanks, I try :)"
      }
      callSendAPI(sender_psid, response);
    }
    else {
      response = {
        "text": "I don't know how to do much, but I can tell jokes! " +
                "Just say 'tell me a joke' and I'll tell you a joke. " +
                "I don't do much else, sorry."
      }
      callSendAPI(sender_psid, response);
    }
  }
}

// Handles any postbacks that exist.
// Aaron's note - We don't have postbacks yet, but this is useful.
function handlePostback(sender_psid, received_postback) {
  console.log('ok')
   let response;
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
  var confirmation_message = "message sent!";
  if (response.text === "") {
    confirmation_message = "empty message sent!";
  }
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log(confirmation_message);
      console.log(PAGE_ACCESS_TOKEN);
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}
