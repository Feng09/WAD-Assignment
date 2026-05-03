import React, { useState, useEffect } from 'react';
import { View, Image, Text, FlatList, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  updateCartQuantity,
  getCartItems,
  removeFromCart,
  reduceStock,
  clearCart,
  createOrder,
  increaseSold,
  getUserProfile,
} from '../services/db-service';
import { getImg, } from '../services/images';
import { createCloudOrder } from '../services/orderCloudService';
import{updateCloudProductPurchase} from '../services/productCloudService';

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

  if (!isAdmin && userName) {
    getCartItems(userName, (data) => {
      console.log("Cart loaded:", data);
      setCart(data);
    });
  }
}, [isAdmin, refreshTrigger, userName]); 

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
     
    updateCartQuantity(itemId, userName, change, (response: any) => {
      if (response.success) {
         
        loadCartData();
        navigation.getParent()?.setParams({
          refresh: Date.now()
        });
      }
    });
  };
 
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
  if (!userName) {
    Alert.alert('Error', 'User information is missing. Please login again.');
    return;
  }

  if (cart.length === 0) {
    Alert.alert("Empty Cart", "Please add items before checking out.");
    return;
  }

  getUserProfile(userName, profile => {
    const hasAddress = profile?.address && profile.address.trim().length > 0;

    if (!hasAddress) {
      Alert.alert(
        'Address Required',
        'Please enter your delivery address in Profile before checkout.',
        [
          {
            text: 'Go to Profile',
            onPress: () => {
              navigation.getParent()?.getParent()?.navigate('Profile', {
                userName,
                isAdmin: false,
              });
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setLoading(true);

    createOrder(userName, cart, async (orderRes: any) => {
      if (!orderRes.success) {
        setLoading(false);
        Alert.alert("Error", "Failed to create order record.");
        return;
      }

      const orderData = {
        userName,
        items: cart,
        total: cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0),
        orderDate: new Date().toISOString(),
        status: "Pending",
        address: profile.address,
      };

      try {
        const apiRes = await createCloudOrder(orderData);
        console.log("Cloud order result:", apiRes);
      } catch (err) {
        console.log("API order upload failed:", err);
      }

      let completed = 0;

cart.forEach((item) => {
  console.log("Checkout item:", item);
  console.log("Local product id:", item.id);
  console.log("Cloud product id:", item.firebaseId || item.cloudId);
  console.log("Quantity:", item.quantity);

reduceStock(item.productId, item.quantity, () => {   
   increaseSold(item.productId, item.quantity, async () => {
      const cloudId = item.firebaseId || item.cloudId;

      if (cloudId) {
        try {
          const res = await updateCloudProductPurchase(
            cloudId,
            item.quantity
          );

          console.log("Cloud stock/sold updated:", res);
        } catch (err) {
          console.log("Cloud stock/sold update failed:", err);
        }
      } else {
        console.log("No cloudId/firebaseId found for item:", item.title);
      }

      completed++;

      if (completed === cart.length) {
        clearCart(userName, (clearRes: any) => {
          setLoading(false);

          if (clearRes.success) {
            setCart([]);

            navigation.getParent()?.setParams({
              refresh: Date.now(),
            });

            Alert.alert(
              "Success",
              "Purchase completed! Your order has been recorded and stock updated.",
              [{ text: "OK" }]
            );
          } else {
            Alert.alert(
              "Partial Success",
              "Order saved but failed to clear cart UI."
            );
                }
              });
            }
          });
        });
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
              
              <View style={{ flex: 1 }}>
                <Text style={c.name}>{item.title}</Text>
                <Text style={c.price}>RM {Number(item.price).toFixed(2)}</Text>
              </View>

              
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