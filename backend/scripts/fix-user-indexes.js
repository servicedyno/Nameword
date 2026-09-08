/**
 * Migration script to fix user indexes for soft-deleted accounts
 * 
 * This script drops the old unique indexes on email, username, and mobile
 * and creates new partial unique indexes that exclude soft-deleted users.
 * 
 * Run this script once after deploying the updated User model:
 * node scripts/fix-user-indexes.js
 */

const mongoose = require("mongoose");
const env = require("../start/env");

async function fixUserIndexes() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(env.DB_URI);
		console.log("Connected to MongoDB");

		const db = mongoose.connection.db;
		const collection = db.collection("users");

		console.log("\n📋 Current indexes:");
		const currentIndexes = await collection.indexes();
		currentIndexes.forEach((idx) => {
			console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
		});

		console.log("\n🗑️  Dropping old unique indexes...");
		
		// Drop old indexes if they exist
		try {
			await collection.dropIndex("email_1");
			console.log("  ✅ Dropped email_1 index");
		} catch (err) {
			if (err.code === 27) {
				console.log("  ⚠️  email_1 index doesn't exist (already dropped or never created)");
			} else {
				console.error("  ❌ Error dropping email_1:", err.message);
			}
		}

		try {
			await collection.dropIndex("username_1");
			console.log("  ✅ Dropped username_1 index");
		} catch (err) {
			if (err.code === 27) {
				console.log("  ⚠️  username_1 index doesn't exist (already dropped or never created)");
			} else {
				console.error("  ❌ Error dropping username_1:", err.message);
			}
		}

		try {
			await collection.dropIndex("mobile_1");
			console.log("  ✅ Dropped mobile_1 index");
		} catch (err) {
			if (err.code === 27) {
				console.log("  ⚠️  mobile_1 index doesn't exist (already dropped or never created)");
			} else {
				console.error("  ❌ Error dropping mobile_1:", err.message);
			}
		}



	
		await collection.createIndex(
			{ email: 1 },
			{
				unique: true,
				sparse: true,
				name: "email_1"
			}
		);
		console.log("  ✅ Created unique index on email");

		await collection.createIndex(
			{ username: 1 },
			{
				unique: true,
				sparse: true,
				name: "username_1"
			}
		);
		console.log("  ✅ Created unique index on username");

		await collection.createIndex(
			{ mobile: 1 },
			{
				unique: true,
				sparse: true,
				name: "mobile_1"
			}
		);
		console.log("  ✅ Created unique index on mobile");

		console.log("\n📋 Updated indexes:");
		const updatedIndexes = await collection.indexes();
		updatedIndexes.forEach((idx) => {
			if (idx.partialFilterExpression) {
				console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (partial: ${JSON.stringify(idx.partialFilterExpression)})`);
			} else {
				console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
			}
		});

		console.log("\n✅ Migration completed successfully!");
		console.log("\n💡 Accounts are now permanently deleted when users delete their accounts.");

	} catch (error) {
		console.error("\n❌ Migration failed:", error);
		process.exit(1);
	} finally {
		await mongoose.connection.close();
		console.log("\n🔌 Disconnected from MongoDB");
	}
}

// Run the migration
fixUserIndexes();

