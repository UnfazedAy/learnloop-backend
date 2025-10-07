

import { supabase } from "./config/database"

const deleteUser = async (email: string) => {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) throw new Error("Failed to fetch users list");

  const user = data.users.find((u) => u.email === email);

  if (!user) throw new Error("User not found in auth.users");

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

  if (deleteError) throw new Error(`Failed to delete user: ${deleteError.message}`);

  return { message: "User deleted successfully from auth.users" };
};

export default deleteUser;

// Call directly (for testing)
deleteUser("ayomidesoniyi3@gmail.com")
  .then(console.log)
  .catch(console.error);
