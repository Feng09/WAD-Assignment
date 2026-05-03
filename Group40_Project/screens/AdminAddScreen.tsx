import React, { useState, useRef } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { addProduct ,updateProductCloudId} from '../services/db-service';
import { getImg } from '../services/images';
import { createCloudProduct } from "../services/productCloudService";

export default function AdminAddScreen({ navigation }: any) {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [form, setForm] = useState({
    title: '',
    price: '',
    stock: '',
    seller: '',
    description: '',
    category: 'Others',
    image: 'p1',
  });

  const handlePickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      (response) => {
        if (response.didCancel) return;

        const asset = response.assets?.[0];

        if (asset?.uri) {
          handleChange('image', asset.uri);
        }
      }
    );
  };

 const handleSave = async () => {
  if (savingRef.current) return;

  savingRef.current = true;
  setSaving(true);

  const { title, price, stock, category, seller, description, image } = form;

  if (!title || !price) {
    Alert.alert("Error", "Product Name and Price are required.");
    savingRef.current = false;
    setSaving(false);
    return;
  }

  const cloudId = "PROD-" + Date.now();

  const productData = {
    title,
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    category: category || "Others",
    seller: seller || "Admin",
    description,
    image: image || "p1",
    sold: 0,
    cloudId,
  };

  // 1️⃣ Save to SQLite first
addProduct(
  productData.title,
  productData.price,
  productData.stock,
  productData.category,
  productData.seller,
  productData.description,
  productData.image,
  async (res: any) => {
    console.log("addProduct result:", res);

    const localId = res?.localId || res?.id || res?.insertId ||res;

    if (localId) {
      try {
        const apiRes = await createCloudProduct(productData);

        if (apiRes.success) {
          updateProductCloudId(localId, apiRes.product.cloudId);
          console.log("Product uploaded to API:", apiRes.product.cloudId);
        }

        Alert.alert("Success", "Product added and synced to API!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } catch (error) {
        console.log("API upload failed:", error);

        Alert.alert("Saved Locally", "Product saved locally, but API sync failed.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } else {
      console.log("No localId returned from addProduct");
      Alert.alert("Error", "Product saved failed. No local ID returned.");
    }

    savingRef.current = false;
    setSaving(false);
  }
);
};
  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Add Product</Text>

      <TextInput
        placeholder="Name"
        style={styles.input}
        onChangeText={v => handleChange('title', v)}
      />

      <TextInput
        placeholder="Price"
        keyboardType="numeric"
        style={styles.input}
        onChangeText={v => handleChange('price', v)}
      />

      <TextInput
        placeholder="Stock"
        keyboardType="numeric"
        style={styles.input}
        onChangeText={v => handleChange('stock', v)}
      />

      <TextInput
        placeholder="Seller"
        style={styles.input}
        onChangeText={v => handleChange('seller', v)}
      />
      <Text style={styles.label}>Select Category:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.category}
          onValueChange={(itemValue) => handleChange('category', itemValue)}
        >
          <Picker.Item label="Fashion" value="Fashion" />
          <Picker.Item label="Electronics" value="Electronics" />
          <Picker.Item label="Home & Living" value="Home" />
          <Picker.Item label="Toys" value="Toys" />
          <Picker.Item label="Others" value="Others" />
        </Picker>
      </View>
      <TextInput
        placeholder="Description"
        multiline
        style={[styles.input, styles.textArea]}
        onChangeText={v => handleChange('description', v)}
      />
      <TouchableOpacity style={styles.button} onPress={handlePickImage}>
        <Text style={styles.buttonText}>Upload Image</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Or paste image URL"
        style={styles.input}
        value={form.image}
        onChangeText={v => handleChange('image', v)}
      />

      {form.image ? (
        <Image
          source={
            form.image.startsWith('http') || form.image.startsWith('file')
              ? { uri: form.image }
              : getImg(form.image || 'p1')
          }
          style={{ width: 100, height: 100, marginTop: 10, borderRadius: 8 }}
        />
      ) : null}

      <TouchableOpacity style={[styles.button, saving &&{opacity:0.5}]} 
        onPress={handleSave} disabled = {saving}>
        <Text style={styles.buttonText}> {saving ? "Saving..." : "Add Product"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },

  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },

  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 18
  },

  textArea: {
    height: 80
  },

  button: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center'
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    marginTop: 10,
  },
  pickerContainer: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 18,
    justifyContent: 'center',
  },
});