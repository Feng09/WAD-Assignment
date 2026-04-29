import React, { useState, useEffect } from 'react';
import { View, Image, Text, FlatList, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  updateCartQuantity,
  getCartItems,
  removeFromCart,
  reduceStock,
  clearCart,
  createOrder
} from '../services/db-service';
import { getImg } from '../services/images';
import { uploadOrderToFirebase } from '../services/firebase-services';

export default function CartScreen({ route, navigation }: any) {
  const [cart, setCart] = useState<any[]>([]);
  const isAdmin = route.params?.isAdmin;
  const refreshTrigger = route.params?.refresh;
  const userName = route.params?.userName;
  const [loading, setLoading] = useState(false);
  const getImageSource = (image?: any) => {
    if (
      typeof image === 'string' &&
      (image.startsWith('http') || image.startsWith('file'))
    ) {
      return { uri: image };
    }

    return getImg(image || 'p1');
  };

  useEffect(() => {
    console.log("CartScreen - Received UserName:", userName);
    if (!isAdmin) {
      const user = route.params?.userName;
      getCartItems(user, (data) => {
        setCart(data);
      });
    }
  }, [isAdmin, refreshTrigger, userName]); /// detect the value diff, run this again like refresg this screen

  if (isAdmin) {
    return (
      <View style={c.center}>
        <Text style={c.icon}>🚫</Text>
        <Text style={c.textBold}>Restricted</Text>
        <Text>Admins cannot use the cart feature.</Text>
      </View>
    );
  }
  const handleQuantityChange = (itemId: number, change: number) => {
    // + - feature 
    updateCartQuantity(itemId, userName, change, (response: any) => {
      if (response.success) {
        // refresh 
        loadCartData();
        navigation.getParent()?.setParams({
          refresh: Date.now()
        });
      }
    });
  };
  // reset data
  const loadCartData = () => {
    getCartItems(userName, (data) => {
      setCart(data);
    });
  };

  const handleDelete = (itemId: number) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeFromCart(itemId, userName, (response: any) => {
              if (response.success) {
                setCart(prevCart => prevCart.filter(item => item.id !== itemId));
                navigation.getParent()?.setParams({
                  refresh: Date.now()
                });
              }
              else {
                Alert.alert("Error", "Failed to remove item");
              }
            })
          }

        }
      ]
    );
  };
  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert("Empty Cart", "Please add items before checking out.");
      return;
    }

    setLoading(true);

    // create the order 
    createOrder(userName, cart, (orderRes: any) => {
      if (!orderRes.success) {
        setLoading(false);
        Alert.alert("Error", "Failed to create order record.");
        return;
      }
      console.log("Order record created successfully");

      //upload to API
      uploadOrderToFirebase({
        userName,
        items:cart,
        total:cart.reduce((sum,i)=>sum+Number(i.price)*i.quantity,0),
        orderDate: new Date().toISOString(),
      })
      .then(()=>{
        console.log("Order upload successfully to cloud");
      })
      .catch(()=>{
        console.log("Failed to upload to cloud");
      });

      // order recorded, start update the stock
      let completed = 0;
      cart.forEach((item) => {
        reduceStock(item.id, item.quantity, (res: any) => {
          console.log(`Inventory updated for ${item.title}`);
          completed++;

          // all stock updated, clear the cart 
          if (completed === cart.length) {
            clearCart(userName, (clearRes: any) => {
              setLoading(false);
              if (clearRes.success) {
                setCart([]);
                // clear the local state, make the cart show empty
                navigation.getParent()?.setParams({
                  refresh: Date.now()
                });
                Alert.alert(
                  "Success",
                  "Purchase completed! Your order has been recorded and stock updated.",
                  [{ text: "OK" }]
                );
              } else {
                Alert.alert("Partial Success", "Order recorded but failed to clear cart UI.");
              }
            });
          }
        });
      });
    });
  };
  return (
    <View style={c.container}>
      <Text style={c.title}>Shopping Basket</Text>

      <FlatList
        data={cart}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item }: any) => {
          const itemTotal = (Number(item.price) * (item.quantity || 1)).toFixed(2);

          return (
            <View style={c.row}>
              <Image
                source={getImageSource(item.image)}
                style={c.productImg}
              />
              {/* product info */}
              <View style={{ flex: 1 }}>
                <Text style={c.name}>{item.title}</Text>
                <Text style={c.price}>RM {Number(item.price).toFixed(2)}</Text>
              </View>

              {/* +- feature */}
              <View style={c.quantityContainer}>
                <TouchableOpacity
                  style={c.qtyBtn}
                  onPress={() => handleQuantityChange(item.id, -1)}
                >
                  <Text style={c.qtyBtnText}>-</Text>
                </TouchableOpacity>

                <Text style={c.qtyText}>{item.quantity || 1}</Text>

                <TouchableOpacity
                  style={c.qtyBtn}
                  onPress={() => handleQuantityChange(item.id, 1)}
                >
                  <Text style={c.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* total price and delete button */}
              <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                <Text style={c.itemTotal}>RM {itemTotal}</Text>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={{ marginTop: 5 }}
                >
                  <Text style={{ color: '#e74c3c', fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={c.empty}>No items in cart.</Text>}
      />

      {cart.length > 0 && (
        <View style={c.footerContainer}>
          <View style={c.footer}>
            <Text style={c.footerTotalText}>Total Payment:</Text>
            <Text style={c.footerTotalAmount}>
              RM {cart.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0).toFixed(2)}
            </Text>
          </View>

          {/* --- 这里就是新加入的结账按钮 --- */}
          <TouchableOpacity
            style={[c.checkoutBtn, loading && { backgroundColor: '#ccc' }]}
            onPress={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={c.checkoutBtnText}>Checkout Now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },

  row: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, color: '#2c3e50' },
  price: { fontWeight: 'bold', color: '#27ae60' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  icon: { fontSize: 60, marginBottom: 10 },
  textBold: { fontSize: 20, fontWeight: 'bold', color: '#c0392b' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    padding: 2,
  },
  qtyBtn: {
    width: 25,
    height: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
  },
  qtyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  qtyText: {
    paddingHorizontal: 10,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    fontWeight: 'bold',
    color: '#333',
  },
  productImg: {
    width: 65,
    height: 65,
    borderRadius: 6,
    marginRight: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTotalText: {
    fontSize: 16,
    color: '#666',
  },
  footerTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  footerContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  checkoutBtn: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});