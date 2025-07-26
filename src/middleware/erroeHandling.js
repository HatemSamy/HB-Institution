

export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}




export const asynchandler = (fu)=>{
    return(req,res,next)=>{
        fu(req,res,next).catch(err=>{
          next(new Error(err,{cause:500}))
        })
    }


 }




 



 export const globalErrorHandling= (err,req,res,next)=>{

    if (err) {
        if (process.env.NODE_ENV==="DEV") {
        res.status(err["cause"]||500).json({messege:"catch error",errMas:err.message,stack:err.stack})
            
        } else {
        res.status(err["cause"]||500).json({messege:"catch error",errMas:err.message})
            
        }
    }
    
    }