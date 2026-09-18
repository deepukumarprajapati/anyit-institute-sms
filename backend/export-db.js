// Export MongoDB data to a portable JSON snapshot.
// Usage: node export-db.js [output-file]
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const outputFile = path.resolve(process.argv[2] || path.join(__dirname, "data", "school-data.json"));

async function exportDatabase() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/school_db";
  await mongoose.connect(uri);
  const collections = await mongoose.connection.db.listCollections().toArray();
  const data = {};

  for (const collection of collections) {
    if (collection.name.startsWith("system.")) continue;
    data[collection.name] = await mongoose.connection.db.collection(collection.name).find({}).toArray();
  }

  const snapshot = {
    format: "school-management-data",
    version: 1,
    exportedAt: new Date().toISOString(),
    database: mongoose.connection.name,
    collections: data,
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  const counts = Object.fromEntries(Object.entries(data).map(([name, documents]) => [name, documents.length]));
  console.table(counts);
  console.log(`Exported ${Object.values(data).reduce((total, documents) => total + documents.length, 0)} documents to ${outputFile}`);
}

exportDatabase()
  .catch((error) => {
    console.error("Export failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
