const prisma = require("../prisma");
const hashPassword = require("../utils/hash").hashPassword;

function cleanObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined)
  );
}

function flattenUser(u) {
  if (!u) return null;
  const out = {
    id: u.id || null,
    email: u.email || null,
    name: u.name || null,
    is_active: u.is_active,
    password_hash: u.password_hash || null,
    bio: u.bio || null,
    role_name: u.auth_role?.name || null,
    
  };
  // console.log("flattenUser:", out);
  return cleanObject(out);
}

module.exports = {
  async getUsers() {
    const users = await prisma.user.findMany({
      orderBy: { created_at: "desc" },
      select: {
        name: true,
        bio: true,
        auth_role: { select: { name: true } }, 
      },
    });
    return users.map(flattenUser);
  },

  async me(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      
    });
    return (user);
  },

  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        auth_role: { select: { name: true } }, 
      },
    });
    return flattenUser(user);
  },

  async getUserByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_active: true,
        name: true,
        bio: true,
        auth_role: { select: { name: true } }, 
      },
    });
    // console.log("getUserByEmail:", user);
    return flattenUser(user);
  },

  createUser(data) {
    return prisma.user.create({ data });
  },

  async updateUser(id, data) {
    if (!id || !data) return null;
    data.role_id = undefined; // prevent direct role_id updates
    data.email = undefined; // prevent email updates here
    const { role_id, ...rest } = data;
    const updateData = { ...rest };


    // remove any undefined/null fields
    const cleaned = cleanObject(updateData);

    const user = await prisma.user.update({
      where: { id },
      data: cleaned,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        auth_role: { select: { name: true } },
      },
    });

  },
  async updatePass(id, data){
    if (!id || !data) return null;
    const hashed = await hashPassword(data);
    const user = await prisma.user.update({
      where: { id },
      data: { password_hash: hashed },
    });
    return user;
  },

  deleteUser(id) {
    return prisma.user.delete({
      where: { id },
    });
  },
};

