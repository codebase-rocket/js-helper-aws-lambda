-----------------
Create IAM policy
-----------------
* Create Your Own Policy -> Select 'JSON'
* Name: `test-policy-lambda`
* Description: Test policy for invoking lambda function
* Policy Document:
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUserToInvokeLambda",
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": [
        "arn:aws:lambda:*:*:function:*node-test"
      ]
    }
  ]
}
```



---------------
Create IAM User
---------------
* Name: `test-user`
* Access type: Programmatic access
* Attach existing policies directly: `test-policy-lambda`
* Note down AWS Key and Secret
