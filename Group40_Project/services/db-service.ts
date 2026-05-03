import SQLite, { SQLiteDatabase, Transaction, SQLiteResultSet } from 'react-native-sqlite-storage';
import { seedAdminToFirebase } from './firebase-services';

let db: SQLiteDatabase;

db = SQLite.openDatabase(
  { name: 'NexusStore.db', location: 'default' },
  () => console.log("Database opened"),
  (err: Error) => console.error("Database Error: ", err)
);

export { db };

export const initDB = () => {
  db.transaction(
    (tx: Transaction) => {
      tx.executeSql(`CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE,password TEXT,role TEXT,address TEXT)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS Admins (id INTEGER PRIMARY KEY AUTOINCREMENT,adminName TEXT UNIQUE,password TEXT,role TEXT,createdAt TEXT)`);
      tx.executeSql('CREATE TABLE IF NOT EXISTS Products (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, price REAL, stock INTEGER DEFAULT 0, category TEXT, seller TEXT, description TEXT, image TEXT, firebaseId TEXT,sold INTEGER DEFAULT 0)');
      tx.executeSql(`CREATE TABLE IF NOT EXISTS Cart (id INTEGER PRIMARY KEY AUTOINCREMENT,productId INTEGER,userName TEXT,title TEXT,price REAL,image TEXT,quantity INTEGER,firebaseId TEXT )`);      tx.executeSql('CREATE TABLE IF NOT EXISTS Orders (id INTEGER PRIMARY KEY AUTOINCREMENT, orderId TEXT, userName TEXT, title TEXT, price REAL, quantity INTEGER, orderDate TEXT, status TEXT)');
 tx.executeSql(`
  CREATE TABLE IF NOT EXISTS Cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER,
    cloudId TEXT,
    title TEXT,
    price REAL,
    quantity INTEGER,
    image TEXT,
    seller TEXT
  );
`);
      tx.executeSql('CREATE TABLE IF NOT EXISTS SyncQueue (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, tableName TEXT, data TEXT, refId TEXT, createdAt TEXT)');

    },
    (err: Error) => {
      console.error("Database Init Error: ", err);
    },
    () => {
      console.log("Database & Tables Created Successfully");
      seedAdmins();
    }
  );
};

export const seedAdmins = () => {
  const admins = [
    { adminName: 'admin', password: '12345', role: 'admin' },
    { adminName: 'aaron.admin', password: '061206', role: 'admin' },
    { adminName: 'foo.admin', password: '12345', role: 'admin' },
    { adminName: 'lim.admin', password: '12345', role: 'admin' },
    { adminName: 'pang.admin', password: '12345', role: 'admin' },
  ];

  db.transaction((tx: Transaction) => {
    admins.forEach(admin => {
      tx.executeSql(
        `INSERT OR IGNORE INTO Admins (adminName, password, role, createdAt)
         VALUES (?, ?, ?, ?)`,
        [
          admin.adminName.toLowerCase(),
          admin.password,
          admin.role,
          new Date().toISOString(),
        ],
        async () => {
          console.log('Admin seeded locally:', admin.adminName);

          try {
            await seedAdminToFirebase({
              adminName: admin.adminName,
              password: admin.password,
              role: admin.role,
            });
          } catch (error: any) {
            console.log(
              'Failed to seed admin to Firebase:',
              admin.adminName,
              error.message
            );
          }
        },
        (_: Transaction, err: Error) => {
          console.log('Seed admin local error:', err.message);
          return false;
        }
      );
    });
  });
};

export const seedProducts = (products: any[]) => {
  db.transaction((tx: any) => {
    products.forEach(p => {
      tx.executeSql(
        'SELECT id FROM Products WHERE id = ?',
        [Number(p.id)],
        (_: any, results: any) => {
          if (results.rows.length === 0) {
            tx.executeSql(
              `INSERT INTO Products 
              (id, title, price, stock, category, seller, description, image, firebaseId, sold) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                Number(p.id),
                p.title,
                Number(p.price) || 0,
                Number(p.stock) || 0,
                p.category || 'Others',
                p.seller || 'Admin',
                p.description || '',
                p.image || 'p1',
                null,
                Number(p.sold) || 0,
              ],
              () => console.log(`Seeded new product: ${p.title}`),
              (_: any, err: any) => {
                console.log("Seed insert error:", err.message);
                return false;
              }
            );
          }
        },
        (_: any, err: any) => {
          console.log("Seed check error:", err.message);
          return false;
        }
      );
    });
  });
};

export const getProductsFromDB = (callback: (data: any[]) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql('SELECT * FROM Products', [], (_: Transaction, results: SQLiteResultSet) => {
      callback(Array.from({ length: results.rows.length }, (_, i) => results.rows.item(i)));
    });
  });
};

export const addToCart = (
  product: any,
  qty: number,
  userName: string,
  callback?: any
) => {
  if (!userName) {
    console.log("Add to Cart Error: Missing userName");
    if (callback) callback({ success: false, reason: "Missing userName" });
    return;
  }

  db.transaction(
    (tx: Transaction) => {
      tx.executeSql(
        'SELECT id, quantity FROM Cart WHERE productId = ? AND userName = ?',
        [product.id, userName],
        (_: Transaction, results: any) => {
          if (results.rows.length > 0) {
            const existingItem = results.rows.item(0);

            tx.executeSql(
              'UPDATE Cart SET quantity = quantity + ? WHERE id = ? AND userName = ?',
              [qty, existingItem.id, userName],
              () => {
                if (callback) callback({ success: true, action: 'updated' });
              },
              (_: Transaction, err: any) => {
                console.log("Update cart error:", err.message);
                if (callback) callback({ success: false, error: err });
                return false;
              }
            );
          } else {
            tx.executeSql(
              `INSERT INTO Cart 
               (productId, userName, title, price, image, quantity, firebaseId) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                product.id,
                userName,
                product.title,
                product.price,
                product.image || product.imgId || "",
                qty,
                product.firebaseId || product.cloudId || null,
              ],
              () => {
                if (callback) callback({ success: true, action: 'inserted' });
              },
              (_: Transaction, err: any) => {
                console.log("Insert cart error:", err.message);
                if (callback) callback({ success: false, error: err });
                return false;
              }
            );
          }
        },
        (_: Transaction, err: any) => {
          console.log("Check cart error:", err.message);
          if (callback) callback({ success: false, error: err });
          return false;
        }
      );
    },
    (err: Error) => {
      console.error("Add to Cart Transaction Error: ", err);
      if (callback) callback({ success: false, error: err });
    }
  );
};

export const updateCartQuantity = (id: number, userName: string, change: number, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Cart SET quantity = quantity + ? WHERE id = ? AND userName = ?',
      [change, id, userName],
      () => {
        
        tx.executeSql(
          'DELETE FROM Cart WHERE id = ? AND userName = ? AND quantity <= 0',
          [id, userName],
          () => {
            console.log(`Quantity updated by ${change} for item ${id}`);
            callback({ success: true });
          }
        );
      },
      (_: Transaction, error: Error) => {
        console.error("Update Quantity Error:", error);
        callback({ success: false });
        return false;
      }
    );
  });
}
export const getCartItems = (userName: string, callback: (data: any[]) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT * FROM Cart WHERE userName = ?',
      [userName],
      (_: any, results: any) => {
        const items = [];
        for (let i = 0; i < results.rows.length; i++) {
          items.push(results.rows.item(i));
        }
        console.log(`DB: Found ${items.length} items for user: ${userName}`);
        callback(items); 
      },
      (_: any, err: any) => {
        console.error("Database Select Error:", err);
        callback([]); 
      }
    );
  });
};

export const removeFromCart = (id: number, userName: string, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'DELETE FROM Cart WHERE id = ? AND userName = ?',
      [id, userName],
      (_: Transaction, result: SQLiteResultSet) => {
        console.log("Item removed from DB");
        callback({ success: true });
      },
      (_: Transaction, error: Error) => {
        console.error("Delete error:", error);
        callback({ success: false });
        return false;
      }
    );
  });
};

export const clearCart = (userName: string, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'DELETE FROM Cart WHERE userName = ?',
      [userName],
      () => {
        console.log(`Cart cleared for user: ${userName}`);
        callback({ success: true });
      },
      (_: Transaction, error: Error) => {
        console.error("Clear Cart Error:", error);
        callback({ success: false });
        return false;
      }
    );
  });
};

export const deleteProductFromDB = (id: number, callback: () => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql('DELETE FROM Products WHERE id = ?', [id], () => callback());
  });
};

export const registerUser = (userName: string, pass: string, callback: any) => {
  const cleanUserName = userName.trim().toLowerCase();

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `INSERT INTO Users (username, password, role, address)
       VALUES (?, ?, ?, ?)`,
      [cleanUserName, pass, 'user', ''],
      () => {
        console.log('User registered locally:', cleanUserName);
        callback({ success: true });
      },
      (_tx: Transaction, err: Error) => {
        console.log('Register Error:', err.message);

        callback({
          success: false,
          reason: err.message,
        });

        return false;
      }
    );
  });
};
export const upsertUserLocal = (
  userName: string,
  pass: string,
  role: string = 'user',
  callback?: any
) => {
  const cleanUserName = userName.trim().toLowerCase();

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `
      INSERT OR REPLACE INTO Users (id, username, password, role, address)
      VALUES (
        (SELECT id FROM Users WHERE LOWER(username) = ?),
        ?, ?, ?,
        COALESCE(
          (SELECT address FROM Users WHERE LOWER(username) = ?),
          ''
        )
      )
      `,
      [cleanUserName, cleanUserName, pass, role, cleanUserName],
      () => {
        console.log('User inserted/updated locally:', cleanUserName);

        if (callback) {
          callback({ success: true });
        }
      },
      (_tx: Transaction, error: Error) => {
        console.log('Upsert user local error:', error.message);

        if (callback) {
          callback({
            success: false,
            reason: error.message,
          });
        }

        return false;
      }
    );
  });
};

export const loginUser = (userName: string, pass: string, callback: any) => {
  const cleanUserName = userName.trim().toLowerCase();

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `SELECT * FROM Users 
       WHERE LOWER(username) = ? 
       AND password = ?`,
      [cleanUserName, pass],
      (_tx: Transaction, results: any) => {
        if (results.rows.length > 0) {
          callback({
            success: true,
            user: results.rows.item(0),
          });
        } else {
          callback({
            success: false,
            reason: 'Invalid username or password',
          });
        }
      },
      (_tx: Transaction, error: Error) => {
        callback({
          success: false,
          reason: error.message,
        });

        return false;
      }
    );
  });
};
export const debugUsersTable = () => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `SELECT * FROM Users`,
      [],
      (_tx, results: any) => {
        console.log('===== LOCAL SQLITE USERS =====');

        for (let i = 0; i < results.rows.length; i++) {
          console.log(results.rows.item(i));
        }

        console.log('Total local users:', results.rows.length);
      },
      (_tx, error) => {
        console.log('Debug users error:', error.message);
        return false;
      }
    );
  });
};

export const loginAdminLocal = (
  adminName: string,
  password: string,
  callback: any
) => {
  if (!adminName || !password) {
    callback({ success: false, reason: 'Missing adminName or password' });
    return;
  }

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT * FROM Admins WHERE adminName = ? AND password = ?',
      [adminName.toLowerCase(), password],
      (_: Transaction, results: any) => {
        if (results.rows.length > 0) {
          callback({
            success: true,
            admin: results.rows.item(0),
          });
        } else {
          callback({
            success: false,
            reason: 'Invalid admin credentials',
          });
        }
      },
      (_: Transaction, err: Error) => {
        console.log('Login Admin Local Error:', err.message);

        callback({
          success: false,
          reason: err.message,
        });

        return false;
      }
    );
  });
};
export const checkStock = (productId: number, callback: (stock: number) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT stock FROM Products WHERE id = ?',
      [productId],
      (_: Transaction, res: SQLiteResultSet) => {
        const stock = res.rows.item(0)?.stock || 0; // get the stock qty 
        callback(stock);
      }
    );
  });
};
export const updateProductStock = (productId: number, newStock: number, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Products SET stock = ? WHERE id = ?',
      [newStock, productId],
      () => callback({ success: true }),
      (_: Transaction, err: SQLiteResultSet) => {
        console.log("Update Stock Error", err);
        return false;
      }
    );
  });
};
//call this after user purchase 
export const reduceStock = (id: number, qty: number, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Products SET stock = MAX(0, stock - ?) WHERE id = ?',
      [qty, id],
      () => callback({ success: true }),
      (_: Transaction, err: Error) => { console.log("Update Stock Error", err); return false; }
    );
  });
};

export const increaseSold = (id: number, qty: number, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Products SET sold = sold + ? WHERE id = ?',
      [qty, id],
      () => callback({ success: true }),
      (_: Transaction, err: Error) => {
        console.log("Increase Sold Error", err);
        return false;
      }
    );
  });
};

export const addProduct = (title: string, price: number, stock: number, category: string, seller: string, description: string, image: string, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'INSERT INTO Products (title, price, stock, category, seller, description, image,firebaseId,sold) VALUES (?, ?, ?, ?, ?, ?, ?,?,?)',
      [title, price, stock, category, seller, description, image, null, 0],
      (_: Transaction, res: any) => {
        console.log("Admin successfully added product:", title);
        callback({
          success: true, localId: res.insertId,
        });
      },
      (_: Transaction, err: Error) => {
        console.error("Add Product SQL Error:", err.message);
        callback({ success: false });
        return false;
      }
    );
  });
};

export const updateProduct = (id: number, title: string, price: number, stock: number, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Products SET title = ?, price = ?, stock = ? WHERE id = ?',
      [title, price, stock, id],
      () => callback({ success: true }),
      (_: Transaction, err: Error) => { console.log("Update Error", err); return false; }
    );
  });
};

export const deleteProduct = (id: number, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql('DELETE FROM Products WHERE id = ?', [id], () => callback({ success: true }));
  });
};

export const updateProductFull = (id: number, title: string, price: number, stock: number, category: string, description: string, image: string, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Products SET title = ?, price = ?, stock = ?, category = ?, description = ?, image = ? WHERE id = ?',
      [title, price, stock, category, description, image, id],
      () => callback({ success: true }),
      (_: Transaction, err: Error) => {
        console.log("Update Error:", err);
        callback({ success: false });
        return false;
      }
    );
  });
};
export const updateProductFirebaseId = (
  id: number,
  firebaseId: string
) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Products SET firebaseId = ? WHERE id = ?',
      [firebaseId, id],
      () => console.log("Firebase ID updated in SQLite"),
      (_: Transaction, err: Error) => {
        console.log("Update firebaseId error:", err.message);
        return false;
      }
    );
  });
};
export const createOrder = (userName: string, cartItems: any[], callback: any) => {
  db.transaction((tx: any) => {
    const date = new Date().toLocaleString();
    
    const orderId = "ORD-" + Date.now();

    cartItems.forEach(item => {
      tx.executeSql(
        'INSERT INTO Orders (orderId, userName, title, price, quantity, orderDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, userName, item.title, item.price, item.quantity, date, "Pending"]
      );
    });
  }, (err: Error) => callback({ success: false }), () => callback({ success: true }));
};

export const getOrdersFromDB = (userName: string, callback: (data: any[]) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT * FROM Orders WHERE userName = ? ORDER BY id DESC',
      [userName],
      (_: any, results: any) => {
        let temp = [];
        for (let i = 0; i < results.rows.length; i++) {
          temp.push(results.rows.item(i));
        }
        callback(temp);
      },
      (_: Transaction, err: Error) => { console.error("Get Orders Error", err); return false; }
    );
  });
};

export const getAllOrdersFromDB = (callback: (data: any[]) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT * FROM Orders ORDER BY id DESC', // 拿到所有数据，按最新时间排序
      [],
      (_: Transaction, results: SQLiteResultSet) => {
        let temp = [];
        for (let i = 0; i < results.rows.length; i++) {
          temp.push(results.rows.item(i));
        }
        callback(temp);
      },
      (_: Transaction, err: Error) => { console.error("Admin Get Orders Error", err); return false; }
    );
  });
};

export const updateOrderStatus = (orderId: string, status: 'Pending' | 'Shipped' | 'Received', callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'UPDATE Orders SET status = ? WHERE orderId = ?',
      [status, orderId],
      () => callback({ success: true }),
      (_: Transaction, err: Error) => {
        console.log("Update Order Status Error:", err);
        callback({ success: false });
        return false;
      }
    );
  });
};

export const removeDuplicateProducts = () => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `
      DELETE FROM Products
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM Products
        GROUP BY title, seller
      )
      `,
      [],
      () => console.log("Duplicate products removed"),
      (_: Transaction, err: Error) => {
        console.log("Remove duplicate error:", err.message);
        return false;
      }
    );
  });
};


export const addToSyncQueue = (
  action: string,  
  tableName: string,
  data: any,
  refId?: string
) => {
  const date = new Date().toISOString();
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'INSERT INTO SyncQueue (action, tableName, data, refId, createdAt) VALUES (?, ?, ?, ?, ?)',
      [action, tableName, JSON.stringify(data), refId || null, date],
      () => console.log(`Added to sync queue: ${action} ${tableName}`),
      (_: Transaction, err: Error) => console.log("Sync queue insert error:", err)
    );
  });
};


export const getPendingSyncItems = (callback: (data: any[]) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT * FROM SyncQueue ORDER BY id ASC',
      [],
      (_: Transaction, results: SQLiteResultSet) => {
        const items = [];
        for (let i = 0; i < results.rows.length; i++) {
          items.push(results.rows.item(i));
        }
        callback(items);
      },
      (_: Transaction, err: Error) => {
        console.log("Get sync queue error:", err);
        callback([]);
      }
    );
  });
};


export const removeSyncItem = (id: number, callback?: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql('DELETE FROM SyncQueue WHERE id = ?', [id], () => {
      console.log(` Removed sync item ${id} from queue`);
      if (callback) callback();
    });
  });
};

// Clear all synced items
export const clearSyncedItems = (callback?: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql('DELETE FROM SyncQueue', [], () => {
      console.log("Cleared sync queue");
      if (callback) callback();
    });
  });
};


export const getSyncQueueCount = (callback: (count: number) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql('SELECT COUNT(*) as count FROM SyncQueue', [], (_: Transaction, results: SQLiteResultSet) => {
      callback(results.rows.item(0).count);
    });
  });
};

export const getOrderCount = (userName: string, callback: (count: number) => void) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT COUNT(DISTINCT orderId) as total FROM Orders WHERE userName = ?',
      [userName],
      (_: any, results: any) => {
        callback(results.rows.item(0).total);
      }
    );
  });
};

export const getTotalSpent = (userName: string, callback: (total: number) => void) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      'SELECT SUM(price * quantity) as grandTotal FROM Orders WHERE userName = ?',
      [userName],
      (_: any, results: any) => {
        const total = results.rows.item(0).grandTotal || 0;
        callback(total);
      }
    );
  });
};
export const updateUserAddress = (
  userName: string,
  address: string,
  callback: any
) => {
  if (!userName) {
    callback({ success: false, reason: 'Missing username' });
    return;
  }

  const cleanUserName = userName.trim().toLowerCase();

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `INSERT OR IGNORE INTO Users (username, password, role, address)
       VALUES (?, ?, ?, ?)`,
      [cleanUserName, '', 'user', address],
      () => {
        tx.executeSql(
          `UPDATE Users 
           SET address = ? 
           WHERE LOWER(username) = ?`,
          [address, cleanUserName],
          (_tx: Transaction, result: any) => {
            console.log('Address update rowsAffected:', result.rowsAffected);

            if (result.rowsAffected > 0) {
              callback({
                success: true,
                rowsAffected: result.rowsAffected,
              });
            } else {
              callback({
                success: false,
                reason: 'Username not found when updating address',
              });
            }
          },
          (_tx: Transaction, err: Error) => {
            console.log('Update User Address SQL Error:', err.message);

            callback({
              success: false,
              reason: err.message,
            });

            return false;
          }
        );
      },
      (_tx: Transaction, err: Error) => {
        console.log('Insert User Address SQL Error:', err.message);

        callback({
          success: false,
          reason: err.message,
        });

        return false;
      }
    );
  });
};
export const updateUserPasswordLocal = (
  userName: string,
  newPassword: string,
  callback: any
) => {
  if (!userName) {
    callback({ success: false, reason: 'Missing username' });
    return;
  }

  const cleanUserName = userName.trim().toLowerCase();

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `UPDATE Users 
       SET password = ? 
       WHERE LOWER(username) = ?`,
      [newPassword, cleanUserName],
      (_tx: Transaction, result: any) => {
        console.log('Reset password username:', cleanUserName);
        console.log('Password update rowsAffected:', result.rowsAffected);

        if (result.rowsAffected > 0) {
          callback({ success: true });
        } else {
          callback({
            success: false,
            reason: `Username "${cleanUserName}" not found in local SQLite`,
          });
        }
      },
      (_tx: Transaction, err: Error) => {
        console.log('Update Local Password Error:', err.message);

        callback({
          success: false,
          reason: err.message,
        });

        return false;
      }
    );
  });
};
export const getUserProfile = (
  userName: string,
  callback: (data: any | null) => void
) => {
  if (!userName) {
    callback(null);
    return;
  }

  const cleanUserName = userName.trim().toLowerCase();

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      `SELECT username, role, address 
       FROM Users 
       WHERE LOWER(username) = ?`,
      [cleanUserName],
      (_tx: Transaction, results: any) => {
        if (results.rows.length > 0) {
          callback(results.rows.item(0));
        } else {
          callback(null);
        }
      },
      (_tx: Transaction, err: Error) => {
        console.log('Get User Profile Error:', err.message);
        callback(null);
        return false;
      }
    );
  });
};
export const deleteUserAccountLocal = (
  userName: string,
  callback: any
) => {
  if (!userName) {
    callback({ success: false, reason: 'Missing userName' });
    return;
  }

  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'DELETE FROM Users WHERE userName = ?',
      [userName.toLowerCase()],
      (_: Transaction, result: any) => {
        console.log('Deleted local user rows:', result.rowsAffected);

        callback({
          success: true,
          rowsAffected: result.rowsAffected,
        });
      },
      (_: Transaction, err: Error) => {
        console.log('Delete User Local Error:', err.message);

        callback({
          success: false,
          reason: err.message,
        });

        return false;
      }
    );
  });
};


export const upsertProductFromCloud = (product: any, callback?: any) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      `
      SELECT id FROM Products
      WHERE firebaseId = ?
         OR (title = ? AND seller = ? AND price = ?)
      LIMIT 1
      `,
      [
        product.cloudId,
        product.title,
        product.seller || "Admin",
        Number(product.price) || 0,
      ],
      (_: any, results: any) => {
        if (results.rows.length > 0) {
          const localId = results.rows.item(0).id;

          tx.executeSql(
            `
            UPDATE Products
            SET title = ?, price = ?, stock = ?, category = ?, seller = ?, description = ?, image = ?, firebaseId = ?, sold = ?
            WHERE id = ?
            `,
            [
              product.title,
              Number(product.price) || 0,
              Number(product.stock) || 0,
              product.category || "Others",
              product.seller || "Admin",
              product.description || "",
              product.image || "p1",
              product.cloudId,
              Number(product.sold) || 0,
              localId,
            ],
            () => {
              console.log("Product updated from API:", product.title);
              if (callback) callback({ success: true });
            }
          );
        } else {
          tx.executeSql(
            `
            INSERT INTO Products
            (title, price, stock, category, seller, description, image, firebaseId, sold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              product.title,
              Number(product.price) || 0,
              Number(product.stock) || 0,
              product.category || "Others",
              product.seller || "Admin",
              product.description || "",
              product.image || "p1",
              product.cloudId,
              Number(product.sold) || 0,
            ],
            () => {
              console.log("Product inserted from API:", product.title);
              if (callback) callback({ success: true });
            }
          );
        }
      }
    );
  });
};

export const updateProductCloudId = (id: number, cloudId: string) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      "UPDATE Products SET firebaseId = ? WHERE id = ?",
      [cloudId, id],
      () => console.log("Cloud ID saved locally"),
      (_: any, err: any) => {
        console.log("Update cloud ID error:", err.message);
        return false;
      }
    );
  });
};
export const removeDuplicateCloudProducts = (callback?: any) => {
  db.transaction((tx: any) => {
    tx.executeSql(
      `
      DELETE FROM Products
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM Products
        GROUP BY title, seller, price
      )
      `,
      [],
      () => {
        console.log("Duplicate products removed");
        if (callback) callback();
      }
    );
  });
};