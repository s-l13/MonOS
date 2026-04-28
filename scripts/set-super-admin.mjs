import { createClerkClient } from "@clerk/backend";

const CLERK_SECRET_KEY = "sk_test_ahE1vWM1kFyDAVYn5cEyzhChHZeIvuMkgTxXC9Bfsz";
const TARGET_EMAIL = "sultan2011888@hotmail.com";

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

const { data: users } = await clerk.users.getUserList({ emailAddress: [TARGET_EMAIL] });

if (!users || users.length === 0) {
  console.error(`No user found with email: ${TARGET_EMAIL}`);
  process.exit(1);
}

const user = users[0];
console.log(`Found user: ${user.id} (${TARGET_EMAIL})`);

await clerk.users.updateUserMetadata(user.id, {
  publicMetadata: {
    role: "super_admin",
    approval_status: "approved",
  },
});

console.log("Done. publicMetadata updated to: { role: 'super_admin', approval_status: 'approved' }");
