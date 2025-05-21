import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("MONGODB_URI must be defined");

const options = {
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 30_000,
  socketTimeoutMS: 120_000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // allow global cache in dev with hot‑reload
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;