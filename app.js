const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let dataBase = null;

const initializeDBAndServer = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// User Register API
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    select * from user where username = "${username}";
    `;
  const dbResponse = await dataBase.get(selectUserQuery);
  const passwordLength = password.length;
  if (dbResponse === undefined) {
    if (passwordLength < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const newUserQuery = `
        insert into user(username, name, password, gender, location)
        values 
        ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');
        `;
      await dataBase.run(newUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    select * from user where username = "${username}";
    `;
  const dbResponse = await dataBase.get(selectUserQuery);
  if (dbResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    // comparing password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      dbResponse.password
    );
    if (isPasswordCorrect === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Change Password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkForUserQuery = `SELECT * FROM user WHERE username = "${username}"`;
  const dbUser = await dataBase.get(checkForUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      const newPasswordLength = newPassword.length;
      if (newPasswordLength < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                    UPDATE user 
                    SET password = "${hashedPassword}"
                    WHERE username = "${username}";
                    `;
        await dataBase.run(updatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
module.exports = app;
