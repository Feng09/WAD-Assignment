import firestore from '@react-native-firebase/firestore';
import { addToSyncQueue, updateProductFirebaseId, getPendingSyncItems, removeSyncItem, getSyncQueueCount } from './db-service';

export const patchSoldToFirebaseProducts = async () => {
  const snapshot = await firestore().collection('products').get();

  for (const productDoc of snapshot.docs) {
    const data = productDoc.data();

    if (data.sold === undefined) {
      await firestore()
        .collection('products')
        .doc(productDoc.id)
        .update({ sold: 0 });
    }
  }
};
// add product
export const uploadProductToFirebase = async (product: any) => {
  return firestore()
    .collection('products')
    .add({
      ...product,
      sold:product.sold||0,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
};

// add order
export const uploadOrderToFirebase = async (order: any) => {
  return firestore()
    .collection('orders')
    .add({
      ...order,
      status: 'Pending',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
};
//read product
export const getProductsFromFirebase = async () => {
  const snapshot = await firestore().collection('products').get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};
//read order
export const getAllOrdersFromFirebase = async () => {
  const snapshot = await firestore()
    .collection('orders')
    .get();

  return snapshot.docs.map(doc => ({
    firebaseId: doc.id,
    ...doc.data(),
  }));
};
//read orders
export const getUserOrdersFromFirebase = async (userName: string) => {
  const snapshot = await firestore()
    .collection('orders')
    .where('userName', '==', userName)
    .get();

  return snapshot.docs.map(doc => ({
    firebaseId: doc.id,
    ...doc.data(),
  }));
};

export const updateOrderStatusInFirebase = async (firebaseId: string,status: 'Pending' | 'Shipped' | 'Received') => {
  return firestore()
    .collection('orders')
    .doc(firebaseId)
    .update({
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
};


export const deleteProductFromFirebase = async (firebaseId: string) => {
  return firestore()
    .collection('products')
    .doc(firebaseId)
    .delete();
};


export const updateProductInFirebase = async (firebaseId: string, product: any) => {
  return firestore()
    .collection('products')
    .doc(firebaseId)
    .update({
      ...product,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
};

export const increaseSoldInFirebase = async (firebaseId: string, qty: number) => {
  return firestore()
    .collection('products')
    .doc(firebaseId)
    .update({
      sold: firestore.FieldValue.increment(qty),
      stock: firestore.FieldValue.increment(-qty),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
};
// add new user
export const uploadUserToFirebase = async (user: any) => {
  return firestore()
    .collection('users')
    .add({
      name: user.name.toLowerCase(),
      password: user.password,
      role: user.role || 'user',
      address: user.address || '',
      createdAt: new Date().toISOString(),
    });
};

export const seedAdminToFirebase = async (admin: {
  adminName: string;
  password: string;
  role: string;
}) => {
  const cleanAdminName = admin.adminName.toLowerCase();

  const snapshot = await firestore()
    .collection('admins')
    .where('adminName', '==', cleanAdminName)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    console.log('Admin already exists in Firebase:', cleanAdminName);
    return;
  }

  await firestore()
    .collection('admins')
    .add({
      adminName: cleanAdminName,
      password: admin.password,
      role: admin.role,
      createdAt: new Date().toISOString(),
    });

  console.log('Admin seeded to Firebase:', cleanAdminName);
};

export const getAdminFromFirebase = async (
  adminName: string,
  password: string
) => {
  const cleanAdminName = adminName.toLowerCase();

  const snapshot = await firestore()
    .collection('admins')
    .where('adminName', '==', cleanAdminName)
    .where('password', '==', password)
    .limit(1)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};
export const getUserFromFirebase = async (name:string, password:string)=>{
    const snapshot = await firestore()
        .collection('users')
        .where('name','==', name.toLowerCase())
        .where('password','==',password)
        .get();
        return snapshot.docs.map(doc=>({
            id:doc.id,
            ...doc.data(),
        }));
};
export const checkUserExists = async (name: string) => {
  const snapshot = await firestore()
    .collection('users')
    .where('name', '==', name.toLowerCase())
    .get();

  return snapshot.docs.length > 0;
};

export const processSyncQueue = async () => {
  return new Promise<void>((resolve, reject) => {
    getPendingSyncItems(async (items) => {
      if (items.length === 0) {
        console.log(" Sync queue is empty");
        resolve();
        return;
      }

      console.log(` Processing ${items.length} pending sync items...`);
      let processed = 0;
      let failed = 0;

      for (const item of items) {
        try {
          const data = JSON.parse(item.data);
          
          switch (item.tableName) {
            case 'Products':
              if (item.action === 'CREATE') {
                const docRef = await uploadProductToFirebase(data);
                if (data.localId) {
  updateProductFirebaseId(data.localId, docRef.id);
}
                console.log(` Synced CREATE product: ${data.title}`);
              } else if (item.action === 'UPDATE' && item.refId) {
                await updateProductInFirebase(item.refId, data);
                console.log(` Synced UPDATE product: ${item.refId}`);
              } else if (item.action === 'DELETE' && item.refId) {
                await deleteProductFromFirebase(item.refId);
                console.log(` Synced DELETE product: ${item.refId}`);
              }
              break;

            case 'Orders':
              if (item.action === 'CREATE') {
                await uploadOrderToFirebase(data);
                console.log(` Synced CREATE order`);
              }
              break;

            default:
              console.log(` Unknown table: ${item.tableName}`);
          }

          // Remove from queue after successful sync
          removeSyncItem(item.id);
          processed++;
        } catch (error) {
          console.log(` Failed to sync item ${item.id}:`, error);
          failed++;
        }
      }

      console.log(`Sync complete: ${processed} success, ${failed} failed`);
      resolve();
    });
  });
};


export const autoSyncOnForeground = async () => {
  getSyncQueueCount((count) => {
    if (count > 0) {
      console.log(` Found ${count} pending items to sync`);
      processSyncQueue()
        .then(() => console.log("Auto-sync completed"))
        .catch((err) => console.log(" Auto-sync failed:", err));
    }
  });
};

export const updateProductStockSoldInFirebase = async (
  firebaseId: string,
  qty: number
) => {
  return firestore()
    .collection('products')
    .doc(firebaseId)
    .update({
      stock: firestore.FieldValue.increment(-qty),
      sold: firestore.FieldValue.increment(qty),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
};

export const updateFirebaseUserAddress = async (
  userName: string,
  address: string
) => {
  const cleanUserName = userName.toLowerCase();

  const snapshot = await firestore()
    .collection('users')
    .where('name', '==', cleanUserName)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Firebase user not found');
  }

  const userDocId = snapshot.docs[0].id;

  await firestore()
    .collection('users')
    .doc(userDocId)
    .update({
      address: address,
      updatedAt: new Date().toISOString(),
    });
};
export const deleteFirebaseUserAccount = async (userName: string) => {
  const cleanUserName = userName.toLowerCase();

  const snapshot = await firestore()
    .collection('users')
    .where('name', '==', cleanUserName)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Firebase user not found');
  }

  const userDocId = snapshot.docs[0].id;

  await firestore()
    .collection('users')
    .doc(userDocId)
    .delete();
};

export const verifyFirebaseUserPassword = async (
  userName: string,
  currentPassword: string
) => {
  const cleanUserName = userName.toLowerCase();

  const snapshot = await firestore()
    .collection('users')
    .where('name', '==', cleanUserName)
    .where('password', '==', currentPassword)
    .limit(1)
    .get();

  return !snapshot.empty;
};

export const updateFirebaseUserPassword = async (
  userName: string,
  newPassword: string
) => {
  const cleanUserName = userName.toLowerCase();

  const snapshot = await firestore()
    .collection('users')
    .where('name', '==', cleanUserName)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Username not found');
  }

  const userDocId = snapshot.docs[0].id;

  await firestore()
    .collection('users')
    .doc(userDocId)
    .update({
      password: newPassword,
      updatedAt: new Date().toISOString(),
    });
};
