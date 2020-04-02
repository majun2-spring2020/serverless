var aws = require('aws-sdk');
var ses = new aws.SES({region: 'us-east-1'});
aws.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
  });
var docClient = new aws.DynamoDB.DocumentClient();
const SECONDS_IN_AN_HOUR = 60 * 60;
// const SECONDS_IN_AN_HOUR = 30;
exports.handler = (event, context, callback) => {
    var payload=JSON.parse(event.Records[0].Sns.Message)
    var email=payload.email
    var bills=payload.bills
    var token=payload.token
    const secondsSinceEpoch = Math.round(Date.now() / 1000);
    const expirationTime= secondsSinceEpoch + SECONDS_IN_AN_HOUR;
    var params = {
        TableName:"EmailAPI",
        Key:{
            "Email": email,
        }
    }
    docClient.get(params, function(err, data) {
        if (err || data==null || data.Item==null) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));            
            putItem(email,expirationTime,token,secondsSinceEpoch)
            sendEmail(email,bills)
        } else {
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            if(data.Item.TimeToLive<secondsSinceEpoch){
                putItem(email,expirationTime,token,secondsSinceEpoch)
                sendEmail(email,bills)
            }
                
        }
    });
    
    // Create sendEmail params 
    
    
    
};

const putItem=(email,expirationTime,token,secondsSinceEpoch)=>{
    var params = {
        TableName:"EmailAPI",
        Item:{
            "Email": email,
            "Token":token,
            "CreatedTime": secondsSinceEpoch,
            "TimeToLive":expirationTime
        },
        TimeToLive: expirationTime 
    };
    docClient.put(params, function(err, data) {
        if (err) {
            // console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            // console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

const sendEmail=(email,bills)=>{
    var HtmlMessage="<HTML><BODY><H1>Bills</H1>"
    var i=1
    var TextMessage=""
    for(let index in bills){
        // console.log(bills[index])
        TextMessage+="Bills"+i+":"+JSON.stringify(bills[index])+"\n"
        HtmlMessage+="<P> Bills"+i+":"+JSON.stringify(bills[index])+"</P>"
        i++
    }
    HtmlMessage+="</BODY></HTML>"   
    var sourceEmail='no-reply@'+process.env.profile+"meepo.me"
    var params = {
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            
            Body: {
                Html:{
                    Data: HtmlMessage
                },
                Text: {
                    Data: TextMessage
                }
            },
            Subject: {
                Data: 'Bills Notifacation'
            }
        },
        Source: sourceEmail /* required */
    };
    // console.log("ready to send")
    // console.log(JSON.stringify(params))
    // Create the promise and SES service object
    ses.sendEmail(params, function (err, data) {
            // callback(null, {err: err, data: data});
            if (err) {
                console.log(err);
                // context.fail(err);
            } else {
                
                console.log(data);
                // context.succeed(event);
            }
        })
    // // Handle promise's fulfilled/rejected states  
}