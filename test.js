import bcrypt from "bcrypt";

const plainPassword = "12345678";

// Hashing
const hashedPassword = await bcrypt.hash(plainPassword, 10); // 10 is the salt rounds

console.log("Hashed password:", hashedPassword);
