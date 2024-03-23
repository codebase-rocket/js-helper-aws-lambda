// Info: Test Cases
'use strict';

// Shared Dependencies
var Lib = {};

/// Set Configrations
const lambda_config = {
  'KEY': require('./.aws.json')['KEY'],
  'SECRET': require('./.aws.json')['SECRET'],
  'REGION': require('./.aws.json')['REGION']
};

// Dependencies
Lib.Utils = require('js-helper-utils');
Lib.Debug = require('js-helper-debug')(Lib);
Lib.Instance = require('js-helper-instance')(Lib);
const Lambda = require('js-helper-aws-lambda')(Lib, lambda_config);


////////////////////////////SIMILUTATIONS//////////////////////////////////////

function test_output(err, response){ // Result are from previous function

  if(err){
    Lib.Debug.logErrorForResearch(err);
  }

  Lib.Debug.log('response', response);

};

///////////////////////////////////////////////////////////////////////////////


/////////////////////////////STAGE SETUP///////////////////////////////////////

// Initialize 'instance'
var instance = Lib.Instance.initialize();

// Lambda to invoke
var lambda_name = 'Ctp-Server-Testing-prod-node-test';

///////////////////////////////////////////////////////////////////////////////


/////////////////////////////////TESTS/////////////////////////////////////////

// Invoke Lambda
Lambda.invoke(
  instance,
  test_output,
  lambda_name,
  {},
  false // asynchronous
);


// Load Lambda Arguments
Lambda.loadLambdaArgsToInstance(
  instance,
  null, // event
  null, // request_context
  test_output // response_callback
);
console.log('instance - loadLambdaArgsToInstance', instance);


// Return Lambda Response
Lambda.returnResponseToLambdaCallback(
  instance,
  { // Response Object
    a: 2,
    b: 'hello'
  }
);
console.log('instance - returnResponseToLambdaCallback', instance);


// Check isLambdaInstance()
console.log(
  "isLambdaInstance(instance)",
  Lambda.isLambdaInstance(instance)
);

///////////////////////////////////////////////////////////////////////////////
