import firestore from '@react-native-firebase/firestore';

// add product
export const uploadProductToFirebase = async (product: any) => {
  return firestore()
    .collection('products')
    .add({
      ...product,
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
//update status
export const completeOrderInFirebase = async (firebaseId: string) => {
  return firestore()
    .collection('orders')
    .doc(firebaseId)
    .update({
      status: 'Completed',
    });
};
// add new user
export const uploadUserToFirebase = async (user: any) => {
  return firestore()
    .collection('users')
    .add({
      name: user.name,
      password: user.password,
      role:user.role || 'user',
      createdAt: new Date().toISOString(),
    });
};

export const getUserFromFirebase = async (name:string, password:string)=>{
    const snapshot = await firestore()
        .collection('users')
        .where('name','==', name)
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
    .where('name', '==', name)
    .get();

  return snapshot.docs.length > 0;
};