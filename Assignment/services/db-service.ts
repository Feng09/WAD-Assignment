import SQLite, { SQLiteDatabase, Transaction,SQLiteResultSet } from 'react-native-sqlite-storage';
import { sqlite3 } from 'sqlite3';


// 1. Explicitly type the db variable
let db: SQLiteDatabase;

// 2. Open the database and assign it to our typed variable
db = SQLite.openDatabase(
  { name: 'NexusStore.db', location: 'default' },
  () => console.log("Database opened"),
  (err:Error) => console.error("Database Error: ", err)
);

export const initDB = () => {
  db.transaction(
    (tx: Transaction) => {  
      // tx.executeSql('DROP TABLE IF EXISTS Products');
      tx.executeSql('CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS Products (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, price REAL, stock INTEGER DEFAULT 0, category TEXT, seller TEXT, description TEXT, image TEXT)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS Cart (id INTEGER PRIMARY KEY, userName TEXT, title TEXT, price REAL, image TEXT, quantity INTEGER)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS Orders (id INTEGER PRIMARY KEY AUTOINCREMENT, orderId TEXT, userName TEXT, title TEXT, price REAL, quantity INTEGER, orderDate TEXT, status TEXT)');
      //tx.executeSql('ALTER TABLE Orders ADD COLUMN status TEXT DEFAULT "Pending"');

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
    ['admin', '12345'],
    ['aaron.admin', '061206'],
    ['foo.admin', '12345'],
    ['lim.admin', '12345'],
    ['pang.admin', '12345']
  ];
  
  db.transaction((tx: Transaction) => {
    admins.forEach(admin => {
      tx.executeSql(
        'INSERT OR IGNORE INTO Users (username, password, role) VALUES (?, ?, ?)',
        [admin[0], admin[1], 'admin'] // role set is admin
      );
    });
  });
};

export const seedProducts = (products: any[]) => {
  db.transaction((tx: any) => {
    tx.executeSql('SELECT COUNT(*) as count FROM Products', [], (_:Transaction, results:SQLiteResultSet) => {
      if (results.rows.item(0).count === 0) {
        products.forEach(p => {
          tx.executeSql(
            'INSERT INTO Products (title, price, stock, category, seller, description, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [p.title, p.price, p.stock, p.category, p.seller, p.description, p.image],
            () => console.log(`Success: ${p.title} inserted`),
            (_:Transaction, err:Error) => { console.log("Insert Error: ", err); return false; }
          );
        });
      }
    });
  });
};

export const getProductsFromDB = (callback: (data: any[]) => void) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql('SELECT * FROM Products', [], (_:Transaction, results:SQLiteResultSet) => {
      callback(Array.from({ length: results.rows.length }, (_, i) => results.rows.item(i)));
    });
  });
};

export const addToCart = (product: any, qty: number, userName: string, callback?: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT quantity FROM Cart WHERE id = ? AND userName = ?',
      [product.id, userName],
      (_: Transaction, results: any) => {
        if (results.rows.length > 0) {
          // if exist, add the quantity
          tx.executeSql(
            'UPDATE Cart SET quantity = quantity + ? WHERE id = ? AND userName = ?',
            [qty, product.id, userName],
            () => { if (callback) callback({ success: true, action: 'updated' }); }
          );
        } else {
          // if not exits, add a new 1 
          tx.executeSql(
            'INSERT INTO Cart (id, userName, title, price, image, quantity) VALUES (?,?,?,?,?,?)',
            [
              product.id, 
              userName, 
              product.title, 
              product.price, 
              product.image || product.imgId || "", // prevent the case of image is emptry
              qty
            ],
            () => { if (callback) callback({ success: true, action: 'inserted' }); }
          );
        }
      }
    );
  }, 
  (err: Error) => {
    console.error("Add to Cart Error: ", err);
    if (callback) callback({ success: false, error: err });
  });
};
///// pluss and minuss feature  pass change number int 1 mean add, pass int -1 mean minuss 
export const updateCartQuantity = (id: number, userName: string, change: number, callback: any) => {
  db.transaction((tx:Transaction) => {
    tx.executeSql(
      'UPDATE Cart SET quantity = quantity + ? WHERE id = ? AND username = ?',
      [change, id, userName],
      () => {
        // if quantity =0 , remove the product 
        tx.executeSql(
          'DELETE FROM Cart WHERE id = ? AND username = ? AND quantity <= 0',
          [id, userName],
          () => {
            console.log(`Quantity updated by ${change} for item ${id}`);
            callback({ success: true });
          }
        );
      },
      (_:Transaction, error:Error) => {
        console.error("Update Quantity Error:", error);
        callback({ success: false });
        return false;
      }
    );
  });
}
export const getCartItems = (userName: string, callback: (data: any[]) => void) => {
  db.transaction((tx:Transaction) => {
    tx.executeSql(
      'SELECT * FROM Cart WHERE username = ?',
      [userName],
      (_: any, results: any) => {
        const items = [];
        for (let i = 0; i < results.rows.length; i++) {
          items.push(results.rows.item(i));
        }
        console.log(`DB: Found ${items.length} items for user: ${userName}`);
        callback(items); // give the quantity and all the thing out 
      },
      (_: any, err: any) => {
        console.error("Database Select Error:", err);
        callback([]); // when error pass a empty things
      }
    );
  });
};

export const removeFromCart = (id: number, username: string, callback: any) => {
  db.transaction((tx:Transaction) => {
    tx.executeSql(
      'DELETE FROM Cart WHERE id = ? AND userName = ?',
      [id, username],
      (_:Transaction, result:SQLiteResultSet) => {
        console.log("Item removed from DB");
        callback({ success: true });
      },
      (_:Transaction, error:Error) => {
        console.error("Delete error:", error);
        callback({ success: false });
        return false;
      }
    );
  });
};
///////////////////call after purchase 
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
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)',
      [userName.toLowerCase(), pass, 'user'], // default role is user
      () => callback({ success: true }),
      (_:Transaction, err:Error) => {
        console.log("Register Error:", err);
        callback({ success: false });
        return false;
      }
    );
  });
};

export const loginUser = (userName: string, pass: string, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT * FROM Users WHERE username = ? AND password = ?',
      [userName.toLowerCase(), pass],
      (_: Transaction, results: any) => {
        if (results.rows.length > 0) {
          // retrun whole user info so that can know the role is admin or user 
          callback({ success: true, user: results.rows.item(0) });
        } else {
          callback({ success: false });
        }
      }
    );
  });
};
export const checkStock = (productId: number, callback: (stock: number) => void) => {
  db.transaction((tx:Transaction)=> {
    tx.executeSql(
      'SELECT stock FROM Products WHERE id = ?',
      [productId],
      (_:Transaction, res:SQLiteResultSet) => {
        const stock = res.rows.item(0)?.stock || 0; // get the stock qty 
        callback(stock);
      }
    );
  });
};
export const updateProductStock = (productId: number, newStock: number, callback: any) => {
  db.transaction((tx:Transaction) => {
    tx.executeSql(
      'UPDATE Products SET stock = ? WHERE id = ?',
      [newStock, productId],
      () => callback({ success: true }),
      (_:Transaction, err:SQLiteResultSet) => { 
        console.log("Update Stock Error", err); 
        return false; 
      }
    );
  });
};
//call this after user purchase 
export const reduceStock = (id: number, qty: number, callback: any) => {
  db.transaction((tx:Transaction) => {
    tx.executeSql(
      'UPDATE Products SET stock = MAX(0, stock - ?) WHERE id = ?',
      [qty, id],
      () => callback({ success: true }),
      (_:Transaction, err:Error) => { console.log("Update Stock Error", err); return false; }
    );
  });
};

export const addProduct = (title: string, price: number, stock: number, category: string, seller: string, description: string, image: string, callback: any) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'INSERT INTO Products (title, price, stock, category, seller, description, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, price, stock, category, seller, description, image],
      () => {
        console.log("Admin successfully added product:", title);
        callback({ success: true });
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
  db.transaction((tx:Transaction) => {
    tx.executeSql(
      'UPDATE Products SET title = ?, price = ?, stock = ? WHERE id = ?',
      [title, price, stock, id],
      () => callback({ success: true }),
      (_:Transaction, err:Error) => { console.log("Update Error", err); return false; }
    );
  });
};

export const deleteProduct = (id: number, callback: any) => {
  db.transaction((tx:Transaction) => {
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

export const createOrder = (userName: string, cartItems: any[], callback: any) => {
  db.transaction((tx: any) => {
    const date = new Date().toLocaleString();
    //generate a OrderID for these product 
    const orderId = "ORD-" + Date.now(); 

    cartItems.forEach(item => {
      tx.executeSql(
        'INSERT INTO Orders (orderId, userName, title, price, quantity, orderDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, userName, item.title, item.price, item.quantity, date, "Pending"]
      );
    });
  }, (err:Error) => callback({ success: false }), () => callback({ success: true }));
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
      (_:Transaction, err:Error) => { console.error("Get Orders Error", err); return false; }
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
      (_:Transaction, err:Error) => { console.error("Admin Get Orders Error", err); return false; }
    );
  });
};

export const completeOrder = (orderId:string, callback:any)=>{
  db.transaction((tx:Transaction)=>{
    tx.executeSql(
      'UPDATE Orders SET status = ? WHERE orderId =?',
      ['Completed', orderId],
      () => callback({success:true}),
      (_: Transaction, err:Error)=>{
        console.log("Complete Order Error:",err);
        callback({success:false});
        return false;
      }
    );
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