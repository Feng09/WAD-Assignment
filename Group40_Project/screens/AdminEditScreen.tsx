import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { updateProductFull, updateProductCloudId } from '../services/db-service';
import { updateCloudProduct, createCloudProduct } from '../services/productCloudService';

export default function AdminEditScreen({ navigation, route }: any) {
  const { product } = route.params;

  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [desc, setDesc] = useState(product.description);

  const handleSave = () => {
  if (!title || !price || !stock) {
    Alert.alert("Error", "Please fill in all fields");
    return;
  }

  const updatedProduct = {
    title,
    price: parseFloat(price),
    stock: parseInt(stock),
    category: product.category,
    description: desc,
    image: product.image,
    seller: product.seller,
    sold: product.sold || 0,
  };

  
  updateProductFull(
    product.id,
    updatedProduct.title,
    updatedProduct.price,
    updatedProduct.stock,
    updatedProduct.category,
    updatedProduct.description,
    updatedProduct.image,
    async (res: any) => {
      if (!res.success) {
        Alert.alert("Error", "Failed to update product.");
        return;
      }

      try {
        
        if (product.firebaseId) {
          await updateCloudProduct(product.firebaseId, {
            ...updatedProduct,
            cloudId: product.firebaseId,
          });

          console.log("API product updated:", product.firebaseId);
        } 
        
        
        else {
          const newCloudId = "PROD-" + product.id;

          const apiRes = await createCloudProduct({
            ...updatedProduct,
            cloudId: newCloudId,
          });

          if (apiRes.success) {
            updateProductCloudId(product.id, apiRes.product.cloudId);
            console.log("Old product created in API:", apiRes.product.cloudId);
          }
        }

        Alert.alert("Success", "Product updated!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } catch (err) {
        console.log("API sync failed:", err);

        Alert.alert("Saved Locally", "Product updated locally, but API sync failed.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    }
  );
};

  return (
    <ScrollView style={s.container}>
      <Text style={s.label}>Product Title</Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle} />

      <Text style={s.label}>Price (RM)</Text>
      <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

      <Text style={s.label}>Stock Quantity</Text>
      <TextInput style={s.input} value={stock} onChangeText={setStock} keyboardType="numeric" />

      <Text style={s.label}>Description</Text>
      <TextInput style={[s.input, { height: 100 }]} value={desc} onChangeText={setDesc} multiline />

      <TouchableOpacity style={s.btn} onPress={handleSave}>
        <Text style={s.btnTxt}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', marginTop: 15, color: '#34495e' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, marginTop: 5 },
  btn: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 5, marginTop: 30, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});