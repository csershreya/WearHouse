const port =4000;
const express = require ("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");


app.use(express.json());
app.use(cors());

//Database connections with mongodb
mongoose.connect("mongodb+srv://shreya02cser:shreya02@cluster0.i3jce.mongodb.net/e-commerce")

//API creation

app.get("/",(req,res)=>{
    res.send("Express app is running.")
})

//Image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})
const upload = multer({storage:storage})

//creating upload endpoint for images
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`https://wearhouse-frontend-1uqq.onrender.com/images/${req.file.filename}`
    })
})

//schema for creating products

const Product = mongoose.model("Product",{
    id: {
        type: Number,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    image:{
        type: String,
        required:true
    },
    category:{
        type:String,
        required: true
    },
    new_price:{
        type: Number,
        required: true
    },
    old_price:{
        type: Number,
        default: true
    },
    date:{
        type: Date,
        default: Date.now
    },
    available:{
        type: Boolean,
        default: true
    }
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name: req.body.name,
    })
})

//creating API for deleting products

app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name: req.body.name
    })
})

//Creating API for getting all products
app.get('/allproducts',async (req,res)=>{
    let products = await Product.find({});
    console.log("All products fetched");
    res.send(products);
})

// Schema creating for user model
const Users = mongoose.model('Users',{
    name:{
        type:String,
        unique:true,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

// Creating endpoint for registering the user
app.post('/signup', async (req,res)=>{

    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false, error:"existing user found with same email address"})
    }
    let cart = {};
    for (let i=0; i<300; i++){
        cart[i]=0;
    }
    const user = new Users({
        name: req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user._id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({success:true,token})
})

// Creating endpoint for user login
app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id: user._id  
                }
            };
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false, error:"Wrong password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong email id"})
    }
})

//creating end point for new collection
app.get('/newcollections',async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("New Collection Fetched");
    res.send(newcollection);
})

//creating end point for popular in women
app.get('/popularinwomen',async (req,res)=>{
    let products = await Product.find({category:"women"});
    let popular = products.slice(0,4);
    console.log("Popular in women Fetched");
    res.send(popular);
})

//creating middleware to fetch user
const fetchUser = async (req,res,next)=>{
    const token= req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try{
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            console.log("User ID:", req.user ? req.user.id : "No user ID");
            next();
        }catch(errors){
            res.status(401).send({errors:"please authenticate using a valid token"})
        }
    }
}

//creating end-point for add to cart
app.post('/addtocart',fetchUser, async (req,res)=>{
    console.log("added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] +=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})


//creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUser, async (req,res)=>{
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

//creating endpoint to get cartData
app.post('/getcart', fetchUser, async (req, res) =>{
    try {
        console.log("GetCart for User ID:", req.user.id);
        let userData = await Users.findOne({_id: req.user.id});
        
        if (!userData) {
            return res.status(404).json({error: "User not found"});
        }
        
        res.json(userData.cartData);
    } catch (error) {
        console.error("Error fetching cart data:", error);
        res.status(500).json({error: "Internal server error"});
    }
});

app.listen(port,(error)=>{
    if(!error){
        console.log(`Server is running on http://localhost:${port}`)
    }
    else{
        console.log("Error: "+error)
    }
})