import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { addToCart, checkStock, reduceStock } from '../services/db-service';
import { getImg } from '../services/images';

export default function DetailScreen({ route, navigation }: any) {
  const { product, isAdmin, isGuest, userName } = route.params || {};
  const [qty, setQty] = useState(1);
  const [modal, setModal] = useState(false);
  const getImageSource = (image: string) => {
    if (typeof image === 'string' && (image.startsWith('http') || image.startsWith('file'))) {
      return { uri: image };
    }
    return getImg(image || 'p1');
  };
  const handleAddToCart = () => {
    // check the stock 
    checkStock(product.id, (currentStock) => {
      if (currentStock <= 0) {
        Alert.alert("Out of Stock", "This item is sold out!");
        return;
      }
      // enough stock, add to the cart
      addToCart(product, qty, userName);
      Alert.alert("Success", "Added to cart!");
    });
  };

  const onAdd = () => {
    // guest cannot place order
    if (isGuest) {
      setModal(true);
      return;
    }

    // realtime stock checking
    checkStock(product.id, (currentStock) => {
      // check whether item is out of stock
      if (currentStock <= 0) {
        Alert.alert("Out of Stock", "This item is sold out!");
        return;
      }

      // check whether selected quantity is more than current stock
      if (qty > currentStock) {
        Alert.alert("Insufficient Stock", `Only ${currentStock} items left.`);
        return;
      }

      // add product to cart, wait until DB update is completed
      addToCart(product, qty, userName, (response: any) => {
        // if DB update failed
        if (!response?.success) {
          Alert.alert("Error", "Failed to add item to cart.");
          return;
        }

        // refresh parent navigator params so cart badge can update
        navigation.getParent()?.getParent()?.setParams({
          refresh: Date.now(),
        });

        // show success message after item is added successfully
        Alert.alert("Success", "Added to your cart!", [
          {
            text: "Continue Shopping",
            onPress: () => navigation.pop(),
          },
          {
            text: "View Cart",

            // navigate to cart and pass refresh timestamp
            onPress: () => {
              navigation.popToTop();
              navigation.navigate("Cart", {
                isAdmin: false,
                userName: userName,
                refresh: Date.now(),
              });
            },
          },
        ]);
      });
    });
  };


  return (
    <ScrollView style={styles.container}>
      <Image
        source={getImageSource(product.image)}
        style={styles.hero}
      />
      <View style={styles.padding}>
        <Text style={styles.stock}>Stock: {product.stock}</Text>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>RM {product.price.toFixed(2)}</Text>
        <Text style={styles.desc}>{product.description}</Text>

        {!isAdmin ? (
          <>
            <View style={styles.qtyRow}>
              <TouchableOpacity onPress={() => qty > 1 && setQty(qty - 1)} style={styles.qBtn}><Text style={styles.w}>-</Text></TouchableOpacity>
              <Text style={styles.qNum}>{qty}</Text>
              <TouchableOpacity onPress={() => qty < product.stock && setQty(qty + 1)} style={styles.qBtn}><Text style={styles.w}>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onAdd} style={[styles.mainBtn, isGuest && { backgroundColor: '#bdc3c7' }]}>
              <Text style={styles.w}>{isGuest ? "Login to Shop" : "Add to Cart"}</Text>
            </TouchableOpacity>
          </>
        ) : <View style={styles.adminBox}><Text>View Only (Admin Mode)</Text></View>}
      </View>

      <Modal visible={modal} >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Account Needed</Text>
            <Text>Please log in to purchase items.</Text>
            <TouchableOpacity style={styles.mainBtn} onPress={() => setModal(false)}>
              <Text style={styles.w}>OK</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  hero: { width: '100%', height: 300 },
  padding: { padding: 20 },
  stock: { color: '#f39c12', fontWeight: 'bold', fontSize: 12 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },
  price: { fontSize: 20, color: '#2ecc71', marginVertical: 5 },
  desc: { color: '#666', lineHeight: 20, marginTop: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 30 },
  qBtn: { backgroundColor: '#3498db', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qNum: { marginHorizontal: 25, fontSize: 18, fontWeight: 'bold' },
  mainBtn: { backgroundColor: '#3498db', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  w: { color: '#fff', fontWeight: 'bold' },
  adminBox: { padding: 20, backgroundColor: '#f5f5f5', borderRadius: 8, marginTop: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  close: { textAlign: 'center', marginTop: 15, color: 'red' }
});