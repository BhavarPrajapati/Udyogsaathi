const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
app.use(express.json({ limit: '35mb' }));
app.use(cors());

const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let isDbConnected = false;

mongoose.connect(process.env.MONGODB_URI , {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
})
.then(() => {
  console.log("Database Connected! 🚀");
  isDbConnected = true;
})
.catch(err => console.error("MongoDB Connection Error:", err));

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  isDbConnected = false;
});
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
  isDbConnected = true;
});
mongoose.connection.on('error', err => console.error('MongoDB error:', err));

app.get('/api/health', (req, res) => {
  res.json({ 
    db: isDbConnected ? 'connected' : 'disconnected',
    dbState: mongoose.connection.readyState 
  });
});

const userSchema = new mongoose.Schema({
  name: String, contact: String, location: String, email: { type: String, unique: true, index: true },
  password: { type: String, required: true }, role: { type: String }, profilePic: String
});

const socialFields = {
  likes: [String],
  comments: [{ userName: String, text: String, timestamp: { type: Date, default: Date.now } }]
};

const jobSchema = new mongoose.Schema({ 
  title: String, salary: String, location: String, description: String, contact: String, 
  ownerEmail: { type: String, index: true }, ownerName: String, ownerPic: String, image: String, 
  ...socialFields 
}, { timestamps: true });
jobSchema.index({ ownerEmail: 1, _id: -1 });

const workerSchema = new mongoose.Schema({ 
  name: String, skill: String, expectedSalary: String, location: String, experience: String, 
  contact: String, email: { type: String, index: true }, ownerName: String, ownerPic: String, 
  image: String, ...socialFields 
}, { timestamps: true });
workerSchema.index({ email: 1, _id: -1 });


const instantSchema = new mongoose.Schema({
  role: String,
  experience: String,
  budget: String,
  location: String,
  pastWork: String,
  fullAddress: String,
  image: String,
  ownerEmail: String,
  ownerName: String, 
  ownerPic: String,  
  contact: String
});

const applicationSchema = new mongoose.Schema({ 
  jobId: String, jobTitle: String, businessEmail: { type: String, index: true }, 
  applicantName: String, applicantEmail: { type: String, index: true }, applicantContact: String,
  status: { type: String, default: 'pending', index: true }, timestamp: { type: Date, default: Date.now }
});
applicationSchema.index({ businessEmail: 1, applicantEmail: 1, timestamp: -1 });

const messageSchema = new mongoose.Schema({ 
  senderEmail: { type: String, index: true }, receiverEmail: { type: String, index: true }, 
  text: String, status: { type: String, default: 'sent' }, timestamp: { type: Date, default: Date.now } 
});
messageSchema.index({ senderEmail: 1, receiverEmail: 1, timestamp: 1 });

const Job = mongoose.model('jobs', jobSchema);
const WorkerProfile = mongoose.model('WorkerProfile', workerSchema);
const InstantService = mongoose.model('InstantService', instantSchema);
const Application = mongoose.model('Application', applicationSchema);
const Message = mongoose.model('Message', messageSchema);
const User = mongoose.model('users', userSchema);
const Business = mongoose.model('Business', new mongoose.Schema({ ...userSchema.obj }));


app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.json({ message: 'Server is working!' });
});

console.log('Routes registered successfully!');

app.post('/api/career-guidance', async (req, res) => {
  try {
    const { userDetails, query, lang } = req.body;
    
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        apiVersion: 'v1' 
    }); 

    const prompt = `Professional career mentor advice for ${userDetails.name}. 
                   Topic: ${query}. 
                   Max 30 words. Motivational. 
                   Language: ${lang === 'hi' ? 'Hindi' : 'English'}.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    res.json({ aiReply: text.trim() });
  } catch (err) { 
    console.error("Detailed AI Error:", err);
    res.json({ aiReply: "AI is updating. Keep focused on your goals!" }); 
  }
});
app.post('/api/upload-image', async (req, res) => {
    try {
        const fileStr = req.body.data;
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
            folder: "udyog_saathi", 
        });
        res.json({ url: uploadResponse.secure_url }); 
    } catch (err) {
        res.status(500).json({ error: 'Cloudinary Upload Failed' });
    }
});

app.post('/api/signup', async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  await new (req.body.role === 'Worker' ? User : Business)({ ...req.body, password: hashedPassword }).save();
  res.status(201).json({ msg: "Success" });
});

app.post('/api/login', async (req, res) => {
  const model = req.body.role === 'Worker' ? User : Business;
  const user = await model.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ error: "Invalid login" });
  res.json({ user });
});

app.put('/api/profile-update', async (req, res) => {
  const model = req.body.role === 'Worker' ? User : Business;
  const user = await model.findOneAndUpdate({ email: req.body.email }, { $set: req.body }, { new: true, lean: true });
  res.json({ user });
});

app.post('/api/apply', async (req, res) => {
    await new Application(req.body).save();
    res.json({ msg: "Applied!" });
});

app.get('/api/notifications/:email', async (req, res) => {
    try {
        const notifs = await Application.find({ 
            $or: [
                { businessEmail: req.params.email }, 
                { applicantEmail: req.params.email }
            ] 
        })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean()
        .maxTimeMS(5000);
        res.json(notifs);
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/notifications', async (req, res) => {
    try {
        const { toEmail, fromEmail, fromName, title } = req.body;
        const newNotification = new Application({
            businessEmail: toEmail,
            applicantEmail: fromEmail,
            applicantName: fromName,
            jobTitle: title,
            status: 'pending'
        });
        await newNotification.save();
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});
app.put('/api/notifications/:id', async (req, res) => {
    try {
        const appData = await Application.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json({ success: true, msg: "done" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/notifications/clear/:email', async (req, res) => {
    try {
        await Application.deleteMany({
            $or: [
                { businessEmail: req.params.email },
                { applicantEmail: req.params.email }
            ]
            
        });
        res.json({ msg: "cleared" });
    } catch (err) {
        res.status(500).json({ error: "Clear failed" });
    }
});

app.put('/api/application-status/:id', async (req, res) => {
    const appData = await Application.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if(req.body.status === 'approved') {
        await new Message({ senderEmail: appData.businessEmail, receiverEmail: appData.applicantEmail, text: `I approved your application for ${appData.jobTitle}.` }).save();
    }
    res.json({ msg: "done" });
});

app.get('/api/chat/:u1/:u2', async (req, res) => {
    try {
        const messages = await Message.find({ 
            $or: [
                { senderEmail: req.params.u1, receiverEmail: req.params.u2 }, 
                { senderEmail: req.params.u2, receiverEmail: req.params.u1 }
            ] 
        })
        .sort({ timestamp: 1 })
        .limit(100)
        .lean()
        .maxTimeMS(5000);
        res.json(messages);
    } catch (err) {
        res.status(500).json([]);
    }
});
app.post('/api/send-message', async (req, res) => { await new Message(req.body).save(); res.json({msg:"sent"}); });

app.get('/api/test-collections', async (req, res) => {
    try {
        console.log('Testing collections...');
        const startTime = Date.now();
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        let jobExists = false, workerExists = false;
        try {
            const jobSample = await Job.findOne().maxTimeMS(2000);
            jobExists = !!jobSample;
        } catch (e) {
            console.log('Job query failed:', e.message);
        }
        
        try {
            const workerSample = await WorkerProfile.findOne().maxTimeMS(2000);
            workerExists = !!workerSample;
        } catch (e) {
            console.log('Worker query failed:', e.message);
        }
        
        const endTime = Date.now();
        
        res.json({ 
            collections: collectionNames,
            jobExists,
            workerExists,
            queryTime: `${endTime - startTime}ms`
        });
    } catch (err) {
        console.error('Collection test error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/test-db', async (req, res) => {
    try {
        console.log('Testing database connection...');
        const startTime = Date.now();
        
        
        const jobCount = await Job.countDocuments().maxTimeMS(3000);
        const workerCount = await WorkerProfile.countDocuments().maxTimeMS(3000);
        
        const endTime = Date.now();
        console.log(`Count queries took: ${endTime - startTime}ms`);
        
        res.json({ 
            jobCount, 
            workerCount, 
            queryTime: `${endTime - startTime}ms`,
            dbState: mongoose.connection.readyState 
        });
    } catch (err) {
        console.error('DB Test error:', err.message);
        res.status(500).json({ error: err.message, dbState: mongoose.connection.readyState });
    }
});

let cache = {
  jobs: { data: [], lastUpdated: 0 },
  workers: { data: [], lastUpdated: 0 },
  instant: { data: [], lastUpdated: 0 }
};
const CACHE_DURATION = 5 * 60 * 1000; 

function isCacheValid(cacheItem) {
  return Date.now() - cacheItem.lastUpdated < CACHE_DURATION;
}

app.get('/api/jobs', async (req, res) => {
    try {
        console.log('Jobs API called at:', new Date().toISOString());
        
        const startTime = Date.now();
        
        const data = await Job.find({})
            .limit(10)
            .lean()
            .maxTimeMS(10000);
            
        const endTime = Date.now();
        console.log(`Jobs query took: ${endTime - startTime}ms, found ${data.length} jobs`);
        
        cache.jobs = { data, lastUpdated: Date.now() };
        
        res.json(data);
    } catch (err) {
        console.error('Jobs API error:', err.message);
        if (cache.jobs.data.length > 0) {
            console.log('Returning stale cached data due to error');
            return res.json(cache.jobs.data);
        }
        res.status(500).json({ error: err.message, timeout: true });
    }
});

app.get('/api/worker-profiles', async (req, res) => {
    try {
        console.log('Worker profiles API called');
        
        
        const startTime = Date.now();
        const data = await WorkerProfile.find({})
            .limit(10)
            .lean()
            .maxTimeMS(10000);
            
        const endTime = Date.now();
        console.log(`Worker query took: ${endTime - startTime}ms, found ${data.length} profiles`);
        
        
        cache.workers = { data, lastUpdated: Date.now() };
        
        res.json(data);
    } catch (err) {
        console.error('Worker profiles error:', err.message);
        if (cache.workers.data.length > 0) {
            return res.json(cache.workers.data);
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/instant-services', async (req, res) => {
    try {
        console.log('Instant services API called');
        
        
        const startTime = Date.now();
        const data = await InstantService.find({})
            .limit(10)
            .lean()
            .maxTimeMS(10000);
            
        const endTime = Date.now();
        console.log(`Instant services query took: ${endTime - startTime}ms, found ${data.length} services`);
        
        cache.instant = { data, lastUpdated: Date.now() };
        
        res.json(data);
    } catch (err) {
        console.error('Instant services error:', err.message);
        if (cache.instant.data.length > 0) {
            return res.json(cache.instant.data);
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/jobs', async (req, res) => {
    try {
        const newJob = new Job({ 
            ...req.body, 
            ownerEmail: req.body.ownerEmail 
        });
        await newJob.save();
        res.json({ msg: "ok" });
    } catch (err) { res.status(500).json({ error: "Failed to post job" }); }
});

app.post('/api/worker-profile', async (req, res) => {
    try {
        const newProfile = new WorkerProfile({ 
            ...req.body, 
            email: req.body.email 
        });
        await newProfile.save();
        res.json({ msg: "ok" });
    } catch (err) { res.status(500).json({ error: "Failed to post profile" }); }
});
// index.js (Backend)
// index.js (Backend) - Ise replace karein
app.post('/api/post-instant', async (req, res) => {
    try {
        const { 
            role, experience, budget, location, pastWork, 
            fullAddress, image, ownerEmail, ownerName, ownerPic, contact 
        } = req.body;

        const newService = new InstantService({
            role,
            experience,
            budget,
            location,
            pastWork,
            fullAddress,
            image,
            ownerEmail,
            ownerName: ownerName || "Verified Professional",
            ownerPic,
            contact
        });

        await newService.save();
        res.json({ msg: "ok", success: true });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: "Database save failed" });
    }
});
app.get('/api/user-activity/:email', async (req, res) => {
    try {
        const userEmail = req.params.email;
        
        const [jobs, skills, instant] = await Promise.all([
            Job.find({ ownerEmail: userEmail }).select('-likes -comments').lean().maxTimeMS(5000),
            WorkerProfile.find({ email: userEmail }).select('-likes -comments').lean().maxTimeMS(5000),
            InstantService.find({ ownerEmail: userEmail }).select('-likes -comments').lean().maxTimeMS(5000)
        ]);
        
        res.json({ 
            posts: [...jobs, ...skills], 
            instant: instant
        });
    } catch (err) { res.status(500).json({ posts: [], instant: [] }); }
});

app.delete('/api/delete/:type/:id', async (req, res) => {
    const model = { worker: WorkerProfile, job: Job, instant: InstantService };
    await model[req.params.type].findByIdAndDelete(req.params.id);
    res.json({msg:"deleted"});
});

app.listen(5000, () => console.log("Server Live 🚀"));