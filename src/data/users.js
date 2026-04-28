import bcrypt from 'bcryptjs';

// All available pages in the system
export const ALL_PAGES = [
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'notifications', label: 'التنبيهات' },
  { id: 'product-cards', label: 'كبون الأصناف' },
  { id: 'final-product-store', label: 'مخزن المنتج النهائي' },
  { id: 'raw-materials-packaging-store', label: 'مخزن الخامات والتعبئة' },
  { id: 'raw-materials-catalog', label: 'تسجيل الخامات' },
  { id: 'suppliers', label: 'تسجيل الموردين' },
  { id: 'rep-sub-stores', label: 'مخازن المناديب' },
  { id: 'reps-management', label: 'إدارة المناديب' },
  { id: 'financial-manager-custody', label: 'عهدة المدير المالي' },
  { id: 'raw-materials-purchases', label: 'مشتريات خامات' },
  { id: 'machine-maintenance-purchases', label: 'مشتريات صيانة مكن' },
  { id: 'misc-purchases', label: 'مشتريات نثرية' },
  { id: 'payroll-advances', label: 'رواتب وسلف' },
  { id: 'sales', label: 'فاتورة مبيعات' },
  { id: 'checks', label: 'تحصيل' },
  { id: 'returns', label: 'المرتجعات' },
  { id: 'customer-payment-alerts', label: 'تنبيهات مواعيد الدفع' },
  { id: 'free-samples', label: 'العينات المجانية' },
  { id: 'credit-sales', label: 'مبيعات الآجل' },
  { id: 'price-list', label: 'قائمة الأسعار' },
  { id: 'custodies', label: 'العهد' },
  { id: 'statement', label: 'كشف حساب' },
];

// Mutable roles store
let _roles = [
  { id: 'admin',      label: 'مدير النظام', isSystem: true,  pages: '*' },
  { id: 'manager',    label: 'مدير',        isSystem: false, pages: ['dashboard','notifications','product-cards','final-product-store','raw-materials-packaging-store','raw-materials-catalog','suppliers','rep-sub-stores','reps-management','financial-manager-custody','raw-materials-purchases','machine-maintenance-purchases','misc-purchases','payroll-advances','sales','checks','returns','customer-payment-alerts','free-samples','credit-sales','price-list','custodies','statement'] },
  { id: 'sales',      label: 'مبيعات',      isSystem: false, pages: ['dashboard','notifications','sales','credit-sales','returns','customer-payment-alerts','free-samples','price-list','checks','statement'] },
  { id: 'warehouse',  label: 'مخازن',       isSystem: false, pages: ['dashboard','notifications','product-cards','final-product-store','raw-materials-packaging-store','raw-materials-catalog','suppliers','rep-sub-stores','raw-materials-purchases','machine-maintenance-purchases','misc-purchases'] },
  { id: 'accountant', label: 'محاسب',       isSystem: false, pages: ['dashboard','notifications','checks','custodies','financial-manager-custody','payroll-advances','statement','sales','credit-sales','returns'] },
];

let _nextRoleId = 100;

// Legacy exports (computed from _roles)
export const ROLES = _roles.map(r => r.id);
export const ROLE_LABELS = Object.fromEntries(_roles.map(r => [r.id, r.label]));
export const ROLE_PAGES  = Object.fromEntries(_roles.map(r => [r.id, r.pages]));

// ── Role CRUD ─────────────────────────────────────────────────────────────────
export function getAllRoles() { return _roles; }

export function getRolePagesById(roleId) {
  return _roles.find(r => r.id === roleId)?.pages ?? [];
}

export function createRole({ label, pages }) {
  if (!label) throw new Error('يرجى إدخال اسم الدور.');
  const id = `role_${_nextRoleId++}`;
  const role = { id, label, isSystem: false, pages: pages ?? [] };
  _roles.push(role);
  return role;
}

export function updateRole(id, { label, pages }) {
  const idx = _roles.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('الدور غير موجود.');
  if (_roles[idx].id === 'admin') throw new Error('لا يمكن تعديل دور المدير.');
  if (label) _roles[idx].label = label;
  if (pages !== undefined) _roles[idx].pages = pages;
  return _roles[idx];
}

export function deleteRole(id) {
  const idx = _roles.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('الدور غير موجود.');
  if (_roles[idx].isSystem) throw new Error('لا يمكن حذف الأدوار الأساسية للنظام.');
  if (_users.some(u => u.role === id)) throw new Error('لا يمكن حذف دور مرتبط بمستخدمين.');
  _roles.splice(idx, 1);
}

let _users = [
  {
    id: '1',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
    displayName: 'المدير',
    code: 'ADM-001',
    role: 'admin',
  },
];

let _nextUserId = 2;

export function getAllUsers() {
  return _users.map(({ passwordHash: _, ...u }) => u);
}

export function getUserById(id) {
  return _users.find(u => u.id === id) || null;
}

export function getUserByUsername(username) {
  return _users.find(u => u.username === username) || null;
}

export function createUser({ username, password, displayName, code, role }) {
  if (_users.find(u => u.username === username)) {
    throw new Error('اسم المستخدم موجود بالفعل.');
  }
  if (!_roles.find(r => r.id === role)) throw new Error('الدور غير صالح.');
  const user = {
    id: String(_nextUserId++),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    displayName,
    code: code || '',
    role,
  };
  _users.push(user);
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function updateUser(id, { displayName, code, role, password }) {
  const idx = _users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('المستخدم غير موجود.');
  if (role && !_roles.find(r => r.id === role)) throw new Error('الدور غير صالح.');
  if (role) _users[idx].role = role;
  if (displayName) _users[idx].displayName = displayName;
  if (code !== undefined) _users[idx].code = code;
  if (password) _users[idx].passwordHash = bcrypt.hashSync(password, 10);
  const { passwordHash: _, ...safe } = _users[idx];
  return safe;
}

export function deleteUser(id) {
  const idx = _users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('المستخدم غير موجود.');
  if (_users[idx].role === 'admin' && _users.filter(u => u.role === 'admin').length === 1) {
    throw new Error('لا يمكن حذف آخر مدير للنظام.');
  }
  _users.splice(idx, 1);
}
