// Info: Boilerplate library. AWS Lambda functions
'use strict';

// Shared Dependencies (Managed by Loader)
var Lib = {};

// For lazy loading of AWS SDK Services
let LambdaClient,
  InvokeCommand;

// Exclusive Dependencies
var CONFIG = require('./config'); // Loader can override it with Custom-Config


/////////////////////////// Module-Loader START ////////////////////////////////

  /********************************************************************
  Load dependencies and configurations

  @param {Set} shared_libs - Reference to libraries already loaded in memory by other modules
  @param {Set} config - Custom configuration in key-value pairs

  @return nothing
  *********************************************************************/
  const loader = function(shared_libs, config){

    // Shared Dependencies (Must be loaded in memory already)
    Lib.Utils = shared_libs.Utils;
    Lib.Debug = shared_libs.Debug;
    Lib.Instance = shared_libs.Instance;

    // Override default configuration
    if( !Lib.Utils.isNullOrUndefined(config) ){
      Object.assign(CONFIG, config); // Merge custom configuration with defaults
    }

  };

//////////////////////////// Module-Loader END /////////////////////////////////



///////////////////////////// Module Exports START /////////////////////////////
module.exports = function(shared_libs, config){

  // Run Loader
  loader(shared_libs, config);

  // Return Public Funtions of this module
  return Lambda;

};//////////////////////////// Module Exports END //////////////////////////////



///////////////////////////Public Functions START///////////////////////////////
const Lambda = { // Public functions accessible by other modules

  /********************************************************************
  Run a lambda function
  Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} lambda_function_name - Name or ARN of Lambda function ("my-function" | "my-function:v1" | "123456789012:function:my-function")
  @param {Set} function_args - Sender's phone number. AWS Long Code. Phone number bought from AWS
  @param {Boolean} synchronous - If true, Invoke the function synchronously. Keep the connection open until the function returns a response or times out.

  @return Thru request Callback.

  @callback - Request Callback
  * @callback {Error} err - In case of error
  * @callback {Set} response - Response from lambda function (Only in case of synchronous execution)
  *********************************************************************/
  invoke: function(instance, cb, lambda_function_name, function_args, synchronous){

    // Initialize AWS service Object if not already Initialized
    _Lambda.initIfNot(instance);


    // Service Params
    var service_params = {
      'FunctionName': lambda_function_name,
      'Payload': JSON.stringify(
        function_args, // Event arguments for function as json
        null, 2 // Fixed
      ),
      'LogType': 'None', // No Log trail
      'InvocationType': 'Event' // For asynchronous invocation
    };

    // Add Optional params to service Params
    if( synchronous ){
      service_params['InvocationType'] = 'RequestResponse'; // For synchronous invocation
    }


    // Invoke Lambda
    Lib.Debug.timingAuditLog('Start', 'AWS invoke lambda', instance['time_ms']);
    instance.aws.lambda.send( new InvokeCommand(service_params) )

      .then(function(response){
        Lib.Debug.timingAuditLog('End', 'AWS invoke lambda', instance['time_ms']);

        ////Lib.Debug.log("AWS response: " +  JSON.stringify(response) ); // response.Payload
        // Process response from Lambda function (Only in case of synchronous execution)
        var lambda_response = (
          !Lib.Utils.isEmpty(response['Payload']) ? // If Payload recieved
          Lib.Utils.stringToJSON(response['Payload']) : // Convert stringified Payload back to JSON
          null // No Payload
        );

        // Return Response from lambda
        return cb(null, lambda_response);

      })

      .catch(function(err){

        // Log error for research
        Lib.Debug.logErrorForResearch(
          err,
          'Cause: AWS Lambda' +
          '\ncmd: Invoke Lambda' +
          '\nparams: ' + JSON.stringify(service_params)
        );

        // Invoke Callback with error
        return cb(err);

      });

  },


  /********************************************************************
  Check if Lambda-Request is Initialized in 'instance'

  @param {reference} instance - Request Instance object reference

  @return {Boolean} - true if running in Lambda instance
  @return {Boolean} - false if not running in Lambda instance
  *********************************************************************/
  isLambdaInstance: function(instance){

    // Check if request data exists in 'instance' object
    if(
      !Lib.Utils.isNullOrUndefined(instance['request']) &&
      instance['request'] !== false
    ){
      return true;
    }
    else{
      return false;
    }

  },


  /********************************************************************
  Set 'AWS Lambda' specific data into Instance Object.

  @param {Map} instance - instance object that is to be modified
  @param {Map} event - event data that executed this module. data from API Gateway (AWS Lambda)
  @param {Map} request_context - AWS Lambda execution related data
  @param {function} response_callback - The calback for final output. Data sent to API Gateway

  @return {Void} - Returns nothing but updates the passed 'Instance Object'
  *********************************************************************/
  loadLambdaArgsToInstance: function(instance, event, request_context, response_callback){

    // Print 'event' data for debugging
    //Lib.Debug.log( 'Event Data: ' + JSON.stringify(event) );

    // Default Data
    instance['auth'] = {
      'token'         : null, // Authorization Token (In case of Authorization Service Only)
      'method_id'     : null, // Method ARN for whom this authentication is being done
      'custom_data'   : null, // Custom-Data saved in API Gateway authorizer (Usually used to cache session-tokens and session-data)
    };
    instance['request'] = {}; // Request Data recieved by Lambda
    instance['response'] = {}; // Response Data to be sent out by Lambda


    // Lock Cleanup until response is returned
    instance['cleanup_locked'] = true;

    // Set Lambda response-Return function
    instance['gateway_response_callback'] = function(...args){
      response_callback(...args);
      instance['cleanup_locked'] = false; // Unlock cleanup
    };


    // Only proceed if 'event' is defined
    if( Lib.Utils.isNullOrUndefined(event) ){
      return; // If empty event then stop here
    }


    // Set authorization Data
      // Auth Token (Only in-case of Service authorization)
      if( 'authorizationToken' in event && event['authorizationToken'] ){
        instance['auth']['token'] = event['authorizationToken'];
      }

      // Auth Method ID (Only in-case of Service authorization)
      if( 'methodArn' in event && event['methodArn'] ){
        instance['auth']['method_id'] = event['methodArn'];
      }

      // Custom-Data saved in API Gateway authorizer (Usually used to cache session-tokens and session-data) (Only in-case of API Gateway authorizer)
      if(
        'requestContext' in event &&
        'authorizer' in event['requestContext'] &&
        !Lib.Utils.isNullOrUndefined( event['requestContext']['authorizer']['stringKey'] ) &&
        event['requestContext']['authorizer']['stringKey'].length > 0
      ){
        instance['auth']['custom_data'] = Lib.Utils.stringToJSON( event['requestContext']['authorizer']['stringKey'] ); // De-flat flattened JSON sent by authorizer
      }


    // Return Nothing.

  },


  /********************************************************************
  Return response data to Lambda Callback

  @param {reference} instance - Request Instance object reference
  @param {Object} [response] - (optional) lambda-response data

  @return {VOID} - Send response data directly to lambda callback
  *********************************************************************/
  returnResponseToLambdaCallback: function(instance, response){

    // Return response
    instance['gateway_response_callback'](null, response);

    // Return true
    return true;

  },

};///////////////////////////Public Functions END//////////////////////////////



//////////////////////////Private Functions START//////////////////////////////
const _Lambda = { // Private functions accessible within this modules only

  /********************************************************************
  Initialize AWS S3 Service Object - Only if not already initialized

  @param {reference} instance - Request Instance object reference

  @return - None
  *********************************************************************/
  initIfNot: function(instance){

    // Create 'aws' object in instance if it's not already present
    if( !('aws' in instance) ){
      instance['aws'] = {};
    }

    // Initialize only if 'lambda' object is not already Initialized
    if( !Lib.Utils.isNullOrUndefined(instance.aws.lambda) ){
      return; // Do not proceed since already initalized
    }


    Lib.Debug.timingAuditLog('Init-Start', 'AWS Lambda Loader', instance['time_ms']);
    // Dependency - AWS SDK - Lambda
    ({
      LambdaClient,
      InvokeCommand
    } = require('@aws-sdk/client-lambda'));

    // Initialize S3 object
    instance.aws.lambda = new LambdaClient({
      region: CONFIG.REGION,
      credentials: {
        accessKeyId: CONFIG.KEY,
        secretAccessKey: CONFIG.SECRET
      },
      maxAttempts: CONFIG.MAX_RETRIES,
      logger: Lib.Debug, // Write debug information to Lib.Debug.log() instead of console.log()
    });
    Lib.Debug.timingAuditLog('Init-End', 'AWS Lambda Loader', instance['time_ms']);

  },

};//////////////////////////Private Functions END//////////////////////////////
