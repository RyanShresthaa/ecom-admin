/**
 * HTML email template for forgot-password OTP.
 */
const forgotPasswordTemplate=({name,otp})=>{
    return `
    <div>   
    <p>Dear, ${name}</p>
    <p>You've requested to reset your password. Please use the following OTP to complete the process</p>
    <div style="background:aqua; font-size:20px; padding:20px; text-align:center; font-weight:bold">
    <h1>${otp}</h1>
    </div>
    <p>This otp is valid only for 1 hour. Enter this otp in the app website in order to proceed with reserting your password</p>
    <br/>
    </br>
    <p>Thank You</p>
    </div>
    `
}

export default forgotPasswordTemplate;