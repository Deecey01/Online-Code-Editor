'use client';
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const { generateFile } = require('./generateFile')
const { executeCpp } = require('./executeCpp');
const { executePy } = require('./executePy');

const Job=require('./models/Job');

mongoose.connect("mongodb://localhost/compilerapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
},).then((res) => {
    console.log("Database connected");
}).catch(error => {
    console.log(error);
});

const app = express();
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/status', async(req, res) => {
    const jobId=req.query.id;
    console.log("status requested", jobId);
    if(jobId===undefined){
        return res.status(400).json({success:true,error:"missing id query param"});
    }
    try{
        const job=await Job.findById(jobId);
        if(job==undefined){
            return res.status(404).json({success:false,error:"invalid job id"});
        }
        return res.status(200).json({success:true,job});
    }catch(err){
        return res.status(400).json({success:false,error:JSON.stringify(err)});
    }
});

app.post('/run', async (req, res) => {
    const { language, code } = req.body;
    console.log(language);
    if (code == undefined) {
        return res.status(400).json({ success: false, error: "Empty code body" });
    }
    let job;
    try {
        const filepath = await generateFile(language, code);
        job=await new Job({language,filepath}).save();
        const jobId=job["_id"];
        console.log(job);

        let output;
        job["startedAt"]=new Date();
        if (language === "cpp") {
            output = await executeCpp(filepath);
        } else {
            output = await executePy(filepath);
        }
        job["completedAt"]=new Date();
        job["status"]="success";
        job["output"]=output;
        await job.save();
        console.log(job)
        return res.json({ jobId });
    } catch (err) {
        job["completedAt"]=new Date();
        job["status"]="error";
        job["output"]=JSON.stringify(err);
        await job.save();
        res.status(500).json({ err });
        console.log(err);
    }

});

app.listen(3030, () => {
    console.log("Listening on port 3030");
});