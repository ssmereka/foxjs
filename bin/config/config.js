// ~>Config
// ~A Scott Smereka

/* Config
 * Create or modify a configuration object used 
 * to setup a server.
 */

/* ************************************************** *
 * ******************** External Modules
 * ************************************************** */

/***
 * Path
 * @description Handles tranforming file paths.
 * @website http://nodejs.org/api/path.html
 */
var path = require('path');

/***
 * FS
 * @stability 3 - Stable
 * @description access the file system
 * @website http://nodejs.org/api/fs.html
 */
var fs = require('fs');


/* ************************************************** *
 * ******************** Internal Modules & Variables
 * ************************************************** */

// Current configuration object.
var config;


/* ************************************************** *
 * ******************** Constructor & Initalization
 * ************************************************** */

/**
 * Constructor
 * Initalize a new configuration object and setup the
 * config module.
 * @param type is the type of config object to create.
 */
var Config = function(type) {

  // Constant variables.
  this.consts = {
    fox:'fox',
    node: 'node',
    local: 'local',
    development: 'development',
    production: 'production'
  };

  // Set a local config instance so we can 
  // refer to "this" outside the constructor.
  config = this;

  // Get a default configuration object based on the type.
  setDefaultConfig(type);

  // Absolute path to the fox bin directory.
  this["foxBinPath"] = path.resolve(__dirname, "../");

  // Absolute path to the fox module root directory.
  this["foxPath"] = path.resolve(this.foxBinPath, "../");

  // Absolute path to the fox server boiler plate directory.
  this["foxServerPath"] = path.normalize(this.foxPath + "/server");

  // Absolute path to the current user directory.
  this["userPath"] = process.cwd();

  // Find the path to the current server's directory.
  this["serverPath"] = getServerPathSync(this);

  config = this;
}


/* ************************************************** *
 * ******************** Private API
 * ************************************************** */

var updateConfigPaths = function(_config) {
  // Absolute path to the fox bin directory.
  _config["foxBinPath"] = path.resolve(__dirname, "../");

  // Absolute path to the fox module root directory.
  _config["foxPath"] = path.resolve(_config.foxBinPath, "../");

  // Absolute path to the fox server boiler plate directory.
  _config["foxServerPath"] = path.normalize(_config.foxPath + "/server");

  // Absolute path to the current user directory.
  _config["userPath"] = process.cwd();

  // Find the path to the current server's directory.
  _config["serverPath"] = getServerPathSync(_config);

  return _config;
}


/**
 * Set configuration properties based on the config type
 * requested.
 * @param type denotes which default config object to use
 * as a basis for the current config object.
 */
var setDefaultConfig = function(type, next) {
  var configObj = getDefaultConfig(type);

  // Make sure there is a cluster configuration object.
  configObj["cluster"] = (configObj["cluster"]) ? configObj["cluster"] : {};

  // Get the number of workers for a clustered server.
  configObj.cluster["workers"] = getNumberOfWorkers(configObj);

  if(next) {
    deepPriorityMerge(configObj, config, next);
  } else {
    for(var key in configObj) {
      if(configObj.hasOwnProperty(key)) {
        config[key] = configObj[key];
      }
    }
  }
}

/**
 * Get default configuration properties for a 
 * specific configuration type.
 */
var getDefaultConfig = function(type) {
  switch(type) {
    case config.consts.node:
      return node;

    case config.consts.local:
      return local;
    
    case config.consts.development:
      return development;

    default:
    case config.consts.production:
      return production;
  }
}

/**
 * Get the number of workers to create based on the 
 * configuration options.
 */
var getNumberOfWorkers = function(config) {
  // Default to a single worker is the cluster is not enabled.
  if(! config || ! config.cluster || ! config.cluster.enabled) {
    return 1;
  }

  var cpuCount = require('os').cpus().length;
  var workerMax = (config.cluster["workerMax"]) ? config.cluster.workerMax : cpuCount;
    
  // Determine the number of workers to create based 
  // on the number of CPUs and the max number of workers.
  var workerCount = (config.cluster["workerPerCpu"] && cpuCount <= workerMax) ? cpuCount : workerMax;

  return (workerCount == cpuCount) ? "max" : workerCount;
}

/**
 * Finds the absolute path to the server application's
 * directory synchronously and returns that value.
 */
function getServerPathSync(_config) {
  _config = (_config) ? _config : config;

  var currentDir = _config.userPath,
      grandParentDir = path.normalize(currentDir + "/server/app"),
      parentDir = path.normalize(currentDir + "/app");

  if(fs.existsSync(currentDir + "/index.js")) {
    return currentDir;
  } else if (fs.existsSync(parentDir + "/index.js")) {
    return parentDir;
  } else if(fs.existsSync(grandParentDir + "/index.js")) {
    return grandParentDir;
  } else {
    return undefined;
  }
}


/* ************************************************** *
 * ******************** Getters & Setters
 * ************************************************** */

/**
 * Check if the server should run in a cluster or not.
 */
var isClusterEnabled = function(_config) {
  _config = (_config) ? _config : config;

  if(_config.cluster && _config.cluster.enabled !== undefined) {
    return _config.cluster.enabled;
  }
  
  return false;
}


/**
 * Check if the server should run in daemon mode or not.
 */
var isDaemonEnabled = function (_config) {
  // Use the local config if the parameter is not defined.
  _config = (_config) ? _config : config;

  // Check if daemon value is set and return its value.
  if(_config && _config.daemon !== undefined) {
    return _config.daemon;
  }

  return false;
}

var getServerName = function() {
  return (config && config.name !== undefined) ? config.name : ""; 
}

var setServerName = function(name) {
  if(config) {
    config["name"] = name;
  }
}

var getServerEnviorment = function() {
  return (config && config.environment !== undefined) ? config.environment : "";
}

var setServerEnviorment = function(env) {
  if(config) {
    config["environment"] = env;
  }
}


/**
 * Merge two objects attributes into a single object.
 * This will do a deep merge, meaning that if both objects 
 * contain an attribute that is also an object, then they 
 * will be merged as well.  This will give all priorty to
 * the first object, meaning if both objects have the same 
 * attribute, the first object's value will be preserved
 * while the second-object's value is not.
 */
var deepPriorityMerge = function(obj1, obj2, done, depth, next) {
  depth = (depth) ? depth : 0;
  var result = {};

  // Loop through all the attributes in the first object.
  for(var key in obj1) {
    
    // If an attribute is also an object and not an array.
    if(obj1.hasOwnProperty(key) && obj1[key] !== null && typeof obj1[key] === 'object' && ! obj1[key] instanceof Array) {     
      
      // And obj2's attribute with the same key is also an object.
      if(obj2.hasOwnProperty(key) && obj2[key] !== null && typeof obj2[key] === 'object') {
        // recurse and merge those objects as well.
        depth++;
        deepPriorityMerge(obj1[key], obj2[key], done, depth, function(err, obj){
          result[key] = obj;
          depth--;
        });
        //result[key] = deepMergeObjects(obj1[key], obj2[key], depth++, next);
      } else {
        // Otherwise store the object in the result.
        result[key] = obj1[key];
      }
    } else {
      // If the attribute is not an object, store it in the results.
      result[key] = obj1[key];
    }
  }

  // Process queue

  // Loop through and add all the attributes in object 2 that
  // are not already in object 1.
  for(i in obj2) {

    // If the attribute is already in the result, skip it.
    if(i in result) {
      continue;
    }

    // Add the new attribute to the result object.
    result[i] = obj2[i];
  }

  if(depth > 0 && next) {
    return next(undefined, result);
  } else if(done) {
    return done(undefined, result);
  } else {
    console.log("Hmmm something has gone wrong...");
    //console.log(result);
  }
}



/* ************************************************** *
 * ******************** Default Configurations
 * ************************************************** */

var fox = {
  name: '', 
  environment: 'local', 
  controller: 'node',
  debug: true
}

// Using node in local development mode.
var node = {
  name: 'fox',
  environment: 'local',
  controller: 'node',
  debug: true
};

// Use nodemon in local development mode.
var local = {
  name: 'fox',
  environment: 'local',
  controller: 'nodemon',
  cluster: {
    enabled: false
  },
  debug: true
};

// Use pm2 in clustered development mode.
var development = {
  name: 'fox',
  environment: 'local',
  controller: 'pm2',
  daemon: true,
  cluster: {
    enabled: true,
    workerPerCpu: true,
    workerMax: 2
  },
  debug: true
};

// Use pm2 in full clustered production mode.
var production = {
  name: 'fox',
  environment: 'production',
  controller: 'pm2',
  daemon: true,
  cluster: {
    enabled: true,
    workerPerCpu: true
  },
  debug: false
};


/* ************************************************** *
 * ******************** Public API
 * ************************************************** */

// Set configuration object.
Config.prototype.setDefaultConfig = setDefaultConfig;
Config.prototype.getDefaultConfig = getDefaultConfig;

// Getters, Setters, and Is methods.
Config.prototype.isClusterEnabled = isClusterEnabled;
Config.prototype.isDaemonEnabled = isDaemonEnabled;
Config.prototype.getNumberOfWorkers = getNumberOfWorkers;
Config.prototype.getServerName = getServerName;
Config.prototype.setServerName = setServerName;
Config.prototype.getServerEnviorment = getServerEnviorment;
Config.prototype.setServerEnviorment = setServerEnviorment;

Config.prototype.updateConfigPaths = updateConfigPaths;


/* ************************************************** *
 * ******************** Export the Public API
 * ************************************************** */

// Reveal the method called when required in other files. 
exports = module.exports = Config;

// Reveal the public API.
exports = Config;