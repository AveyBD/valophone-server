const express = require("express");
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middlware 
app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Server is UP!");
});

app.listen(port, () => {
  console.log(`Manufacturer App is listening to port: ${port}`);
});
