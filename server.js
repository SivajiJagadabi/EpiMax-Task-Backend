const express=require('express')
const sqlite3=require('sqlite3')
const {open}=require('sqlite')
const path=require('path')
const dbPath=path.join(__dirname,'task.db')
const cors=require('cors')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const { validateHeaderName } = require('http')
const { resolveSoa } = require('dns')
const app=express()
let db=null 

app.use(cors())
app.use(express.json())


const initializeDbAndServer=async()=>{
    try{
        db=await open({
            filename:dbPath,
            driver:sqlite3.Database
        })
        app.listen(3001,console.log('server runnig at  port: 3001'))
    }catch(error){console.log(`Database Error: ${error}`)
}
}

initializeDbAndServer()


const validaPasswordLength=(password_hash)=>{
    return password_hash.length>6;
}


app.post('/register',async(req,res)=>{
    const {username,password_hash}=req.body
    const selectUserQuery=`select * from users where username='${username}';`;
    const dbUser=await db.get(selectUserQuery)
    if(dbUser!==undefined){
        res.send(400)
        res.send('User Already Exists!')
    }else{
        if(validaPasswordLength(password_hash)){
            const hashedPassword=await bcrypt.hash(password_hash,10)
            const createUserQuery=`INSERT INTO users(username,password_hash) 
            VALUES('${username}','${hashedPassword}');`;
            const user=await db.run(createUserQuery)
            res.send("User Created Successfully")

        }else{
            res.send('User Password is too Short')
        }
    }
})


app.post('/login',async(req,res)=>{
    const {username,password_hash}=req.body
    const getUserQuery=`select * from users where username='${username}';`;
    const dbUser=await db.get(getUserQuery)
    if(dbUser==='undefined'){
        res.send('Invalid User')
    }else{
        const isPasswordMatch=await bcrypt.compare(password_hash,dbUser.password_hash)
        if(isPasswordMatch===true){
            const payload={username:username}
            const jwtToken=jwt.sign(payload,'abcdef')
            res.send({jwtToken})
        }else{
            res.send('Invalid Password')
        }
    }
})



const authenticationToken=(req,res,next)=>{
    let jwtToken 
    const authHeader=req.headers['authorization']
    if(authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1]
    }else{
        res.status(401)
        res.send('Invalid jwtToken')
    }if(jwtToken!==undefined){
        jwt.verify(jwtToken,'abcdef',(error,payload)=>{
            if(error){
                res.status(401)
                res.send("Invalid jwtToken")
            }else{
                req.username=payload.username
                console.log(payload)
                next()
            }
        })
    }
}

app.get('/tasks',authenticationToken,async(req,res)=>{
    const getTasksQuery=`select * from tasks`
    const data=await db.all(getTasksQuery)
    res.send(data)
})

app.get('/tasks/:id',authenticationToken,async(req,res)=>{
    const {id}=req.params 
    const getTaskQuery=`select * from tasks where id=${id};`;
    const data=await db.get(getTaskQuery)
    res.send(data)
})

app.delete('/tasks/:id',authenticationToken,async(req,res)=>{
    const {id}=req.params 
    const deleteTaskQuery=`delete from tasks where id=${id};`; 
    const data=await db.run(deleteTaskQuery)
    res.send('Task Successfully Deleted')
})

app.put('/tasks/:id',authenticationToken,async(req,res)=>{
    const {id}=req.params
    const {status}=req.body
    const updateTask=`update tasks SET status='${status}'
     where id=${id};`;
    const data=await db.run(updateTask)
    res.send('Task Successfully Updated')
})

app.post('/tasks/:id',authenticationToken,async(req,res)=>{
    const {id}=req.params
    const {title,description,status,assignee_id,created_at,updated_at}=req.body
    const createTaskQuery=`INSERT INTO Tasks(id,title,description,status,assignee_id,created_at,updated_at)
    VALUES('${id}','${title}','${description}','${status}','${assignee_id}','${created_at}','${updated_at}');
    `;
    const data=await db.run(createTaskQuery)
    res.send('Task Created Successfully')
})