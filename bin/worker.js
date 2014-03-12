

/***
 * Child Process
 * @stability 3 - Stable
 * @description Handle child processes in node.js
 * @website http://nodejs.org/api/child_process.html
 */
var childProcess = require('child_process');

var async = require('async')

/* ************************************************** *
 * ******************** Library Variables
 * ************************************************** */

var debug = false,
    fox,
    trace = false;


/* ************************************************** *
 * ******************** Constructor & Initalization
 * ************************************************** */

var Worker = function(_fox) {
  // Handle parameters
  fox = _fox;
  fox.littleChildren = [];

  // Load external modules.
  argv = require('optimist').argv;
  request = require('request');

  // Configure message instance.
  handleConfig(fox["config"]);
}

/**
 * Setup the module based on the config object.
 */
var handleConfig = function(config) {
  if(config) {
    if(config["system"]) {
      debug = (config.system["debug"]) ? config.system["debug"] : debug;
      trace = (config.system["trace"]) ? config.system["trace"] : trace;
    }
  }
}


/* ************************************************** *
 * ******************** Private API
 * ************************************************** */

/**
 *
 */
var fork = function(command, args, options, end, onStdout, onStderr, onMessage) {
  var child = childProcess.fork(command, args, options);

  if(onMessage) {
    child.on('message', onMessage);
  }

  if(onStdout) {
    child.stdout.on('data', onStdout);
  }

  if(onStderr) {
    child.stderr.on('data', onStderr);
  }

  // Define what to do when a child is closed.
  child.on('close', function(code) {
    if(end) {
      end(undefined, code);
    }

    // Remove the child from the list of children processes.
    removeChild(this);
  });
  
  // Add the child to the list of children processes.
  addChild(child);

  return child;
}

var execute = function(cmd, end) {
  var child = childProcess.exec(cmd, function(err, stdout, stderr) {
    if(end) {
      end(err, stdout, stderr);
    }
  });
}


/**
 * Execute a command in a child process.
 * @param command is the command to be executed by the child's process.
 * @param args are the args to be sent to the child's command.
 * @param options are the options to be sent to the child's command.
 * @param showStd when true, will show all stdout and stderrs to
 * the current processes' stdout and stderr.
 * @param end is a callback function called when the child is killed.
 */
var spawn = function(command, args, options, showStd, end) {
  // Default to showing the stderr and stdout.
  showStd = (showStd === undefined) ? true : showStd;

  var child = childProcess.spawn(command, args, options);

  var stdout = "",
      stderr = "";

  // Handle child process standard out.
  child.stdout.on('data', function(data) {
    if(data) {
      stdout += data.toString();
      if(showStd) {
        process.stdout.write("" + data);
      }
    }
  });

  // Handle child process standard error.
  child.stderr.on('data', function(data) {
    if(data) {
      stderr += data.toString();
      if(showStd) {
        process.stderr.write("" + data);
      }
    }
  });

  // Define what to do when a child is closed.
  child.on('close', function(code) {
    if(end) {
      end(undefined, code, stdout, stderr);
    }

    // Remove the child from the list of children processes.
    removeChild(this);
  });

  // Add the child to the list of children processes.
  addChild(child);

  return child;
}

/**
 * Add a child process to the list of children processes.
 */
var addChild = function(child, _fox) {
  if( ! child) {
    return log.error("Cannot add child '" + child +"' to list of children.");
  }

  _fox = ( ! _fox) ? fox : _fox;

  if( ! _fox["littleChildren"]) {
    _fox["littleChildren"] = [ child ];
  } else {
    _fox.littleChildren.push(child);
  }
}

/**
 * Remove a child process from the list of children processes.
 */
var removeChild = function(child, _fox) {
  if( ! child) {
    return log.error("Cannot remove child '" + child +"' from list of children.");
  }

  _fox = ( ! _fox) ? fox : _fox;

  if( ! _fox["littleChildren"]) {
    return log.error("Cannot remove child from empty list of children.");
  }

  var index = _fox.littleChildren.indexOf(child);
  if(index > -1) {
  	_fox.littleChildren.splice(index, 1);
  }
}

/**
 * Kill all child processes gracefully, then 
 * proceed with exiting or the callback.
 */
var killChildren = function(index, signal, end) {
  var littleChildren = fox.littleChildren;
  // Ensure signal is valid or defaults to SIGINT.
  signal = (signal === undefined) ? "SIGINT" : signal;

  // Ensure callback is valid or defaults to exit.
  end = (end === undefined) ? function() { fox.exit(); } : end;

  // Ensure index is valid, or defaults to first child.
  index = ( ! index || index >= littleChildren.length || index < 0) ? 0 : index;
  
  var tasks = [];

  for(var i = index; i < littleChildren.length; i++) {
    tasks.push(killChildFunction(littleChildren[i], signal));
  }

  async.parallel(tasks, function(err, results) {
    end();
  });
}

function killChildFunction(child, signal) {
  return function(next) {
    killChild(child, signal, next);
  }
};

/**
 * Kill a child process sending the requrested
 * signal.  Once the child is killed, it make a 
 * call to the callback.
 */
function killChild(child, signal, next) {
  // Event so child makes a call to the next
  // callback after closing.
  child.once('close', function(code) {
    if(next) {
      next();
    }
  });

  // Kill the child process with the specified signal.
  process.kill(child.pid, signal);
}



/* ************************************************** *
 * ******************** Public API
 * ************************************************** */

// Expose the public methods available.
Worker.prototype.fork = fork;
Worker.prototype.execute = spawn;
Worker.prototype.addChild = addChild;
Worker.prototype.removeChild = removeChild;
Worker.prototype.killChildren = killChildren;
Worker.prototype.killChildFunction = killChildFunction;


/* ************************************************** *
 * ******************** Export the Public API
 * ************************************************** */

// Reveal the method called when required in other files. 
exports = module.exports = Worker;

// Reveal the public API.
exports = Worker;