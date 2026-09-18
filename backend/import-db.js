// Import a JSON snapshot into MongoDB.
// Usage: node import-db.js --replace [input-file]
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const models = [
  require("./src/models/Admin"),
  require("./src/models/Parent"),
  require("./src/models/Student"),
  require("./src/models/Teacher"),
  require("./src/models/Class"),
  require("./src/models/Subject"),
  require("./src/models/Attendance"),
  require("./src/models/AttendanceRecord"),
  require("./src/models/Event"),
  require("./src/models/Exam").Exam,
  require("./src/models/Exam").Result,
  require("./src/models/Fee").FeeStructure,
  require("./src/models/Fee").FeePayment,
  require("./src/models/Fee").Concession,
  require("./src/models/Homework"),
  require("./src/models/Library").Book,
  require("./src/models/Library").BookIssue,
  require("./src/models/Notice"),
  require("./src/models/Permission"),
  require("./src/models/Badge").Badge,
  require("./src/models/Badge").UserBadge,
  require("./src/models/Badge").Challenge,
  require("./src/models/Conversation"),
  require("./src/models/Message"),
  require("./src/models/ScheduledExam"),
  require("./src/models/ExamSubject"),
  require("./src/models/Test"),
  require("./src/models/SchoolPeriod"),
  require("./src/models/StudyMaterial"),
  require("./src/models/Timetable"),
  require("./src/models/TimetableEntry"),
  require("./src/models/Transport"),
];
const modelsByCollection = new Map(models.map((model) => [model.collection.name, model]));
const inputFile = path.resolve(process.argv.find((argument, index) => index > 1 && argument !== "--replace") || path.join(__dirname, "data", "school-data.json"));

async function clearDatabase() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const collection of collections) {
    if (!collection.name.startsWith("system.")) {
      await mongoose.connection.db.collection(collection.name).deleteMany({});
    }
  }
}

async function importDatabase() {
  if (!process.argv.includes("--replace")) {
    throw new Error("Import is destructive. Re-run with --replace to clear the local database first.");
  }
  if (!fs.existsSync(inputFile)) throw new Error(`Snapshot not found: ${inputFile}`);

  const snapshot = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  if (snapshot.format !== "school-management-data" || snapshot.version !== 1 || !snapshot.collections) {
    throw new Error("Invalid or unsupported data snapshot.");
  }

  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/school_db";
  await mongoose.connect(uri);
  await clearDatabase();

  const counts = {};
  for (const [collectionName, documents] of Object.entries(snapshot.collections)) {
    if (!documents.length) continue;
    const model = modelsByCollection.get(collectionName);
    if (!model) throw new Error(`No Mongoose model registered for collection: ${collectionName}`);
    await model.insertMany(documents, { ordered: true });
    counts[collectionName] = documents.length;
  }

  console.table(counts);
  console.log(`Imported ${Object.values(counts).reduce((total, count) => total + count, 0)} documents from ${inputFile}`);
}

importDatabase()
  .catch((error) => {
    console.error("Import failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
