// ~> Library
// ~A Scott Smereka

/* Model
 * Library for handling common tasks for a MongoDB models.
 */


/* ************************************************** *
 * ******************** Library Variables
 * ************************************************** */

var debug,
    fox,
    log,
    sanitize;


/* ************************************************** *
 * ******************** Constructor & Initalization
 * ************************************************** */

/**
 * Constructor
 * Handles initalization of the send library.
 */
var Send = function() {
  debug = false;
  fox = require("../");
  log = fox.log;
  sanitize = require("sanitize-it");
}


/* ************************************************** *
 * ******************** Private API
 * ************************************************** */

var sanitizeObj = function(obj, req) {
  // Return object as is, if this is not an api call.
  if(! sanitize.isApi(req)) {
    return (obj) ? obj : undefined;
  }

  // Return obj as API object.
  var apiObj = {}
  apiObj["status"] = "OK"
  apiObj["response"] = obj;
  return apiObj;
}

var sanitizeError = function(err, req) {
  // Return error as object.
  if(! sanitize.isApi(req)) {
    var obj = { "error" : err.message, "status": err.status };
    
    if(debug) {
      obj["trace"] = err.stack;
      obj["url"] = (req && req.url) ? req.url : undefined;
    }
    
    return obj;
  }

  // Return error as API object.
  var apiErr = {}
  //apiErr["status"] = err.status;
  apiErr["status"] = "ERROR";
  apiErr["errorcode"] = err.status;
  apiErr["error"] = err.message;
  apiErr["response"] = {};
  if(debug) {
    apiErr["trace"] = err.stack;
    apiErr["url"] = (req && req.url) ? req.url : undefined;
  }
  return apiErr;
}

var send = function(obj, req, res, next) {
  // If the request was an API request, then format it as so.
  obj = sanitizeObj(obj, req);

  if(sanitize.isJson(req)) {
    return res.send(JSON.stringify(obj));
  }

  if(sanitize.isText(req)) {
    return res.type('txt').send(JSON.stringify(obj));
  }

  if(next !== undefined) {
    return next();
  }

  // Default to JSON if we can't continue on.
  if(obj !== undefined) {
    return res.send(obj);
  }
};

var createAndSendError = function(err, status, req, res, next) {
  if(err && ! err.message) {
    var obj = new Error(err);
    err = obj;
  }

  if(! err) {
    err = new Error("undefined");
  }

  if(! err.status) {
    if(status) {
      err.status = status;
    }
  }

  return this.sendError(err, req, res, next);
};

var sendError = function(err, req, res, next) {
  // Ensure we have a valid error object.
  if(! err) {
    err = new Error("undefined");
  }
  
  // Ensure the error object has a status.
  if(! err.status) {
    err.status = 500;
  }

  // Log the error if we are in debug mode.
  log.e(err, debug);

  // Create an object we can send to the user.
  var errObj = sanitizeError(err, req);
  
  // Log the error url if it is available.
  if(errObj.url) {
    log.d("\t" + "URL: " + req.url)
  }

  // Send a TEXT response.
  if(sanitize.isText(req)) {
    return res.type('txt').send(errObj.toString(), err.status);
  }

  // Send a JSON response.  Default to JSON if the format is not specified.
  if(sanitize.isJson(req) || (req && req.format === undefined)) {
    return res.send(errObj, err.status);
  }

  // Keep moving on, we couldn't handle the request here.
  if(next !== undefined) {
    return next();
  }
};


/* ************************************************** *
 * ******************** Public API
 * ************************************************** */

// Expose the public methods available.
Send.prototype.sendError = sendError;
Send.prototype.createAndSendError = createAndSendError;
Send.prototype.sanitizeObj = sanitizeObj;
Send.prototype.sanitizeError = sanitizeError;


/* ************************************************** *
 * ******************** Export the Public API
 * ************************************************** */

// Reveal the method called when required in other files. 
exports = module.exports = Send;

// Reveal the public API.
exports = Send;