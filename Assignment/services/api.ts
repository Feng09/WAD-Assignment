const initialItems = [
  { id: 1, title: "Classic Denim Jacket", price: 159.0, stock: 50, category: "Fashion", seller: "Goober Dabber", description: "A timeless denim jacket.", image: 'denim' },
  { id: 2, title: "Wireless Headphones", price: 450.5, stock: 147, category: "Electronics", seller: "Pablo Mablo", description: "High-fidelity audio.", image: 'audio' },
  { id: 3, title: "Smart Fitness Watch", price: 299.0, stock: 26, category: "Electronics", seller: "Kopi Mao", description: "Track your health.", image: 'watch' },
  { id: 4, title: "Leather Travel Bag", price: 120.0, stock: 87, category: "Fashion", seller: "KKB Destroyer", description: "Handcrafted leather.", image: 'bag' },
  { id: 5, title: "Ultraman PLUS", price: 30.0, stock: 147, category: "Toys", seller: "Fablo Maslow", description: "Non-harmful toy.", image: 'toy' },
  { id: 6, title: "Gaming keyboard", price: 350.0, stock: 23, category: "Electronics", seller: "Pro Gamer", description: "Zero input delay.", image: 'kb' },
  { id: 7, title: "Laufey Album", price: 105.5, stock: 56, category: "Music", seller: "Layvay", description: "Incredible jazz album.", image: 'album' },
  { id: 8, title: "CS2 AK-47 Figure", price: 15.7, stock: 349, category: "Toys", seller: "Ah Lim", description: "Small FPS figure.", image: 'gun' },
  { id: 9, title: "Samsung S22", price: 4300.0, stock: 23, category: "Electronics", seller: "Aron Tey", description: "Premium smartphone.", image: 'phone' },
  { id: 10, title: "Tiger Woods T-shirt", price: 50.0, stock: 999, category: "Fashion", seller: "FaiSugu", description: "100% cotton.", image: 'shirt' },
];

export const fetchProducts = async (): Promise<any[]> => {
  return initialItems;
};
  
  // POST to cloud when new item added
  export const uploadProductToCloud = async(product:any) =>{
    const response = await fetch('https://jsonplaceholder.typicode.com/posts',{
      method :'POST',
      headers:{
        Accept:'application/json','Content-Type':'application/json',
      },
      body:JSON.stringify(product),
    });
  if(!response.ok){
    throw new Error('Failed to upload to cloud ');
  }
  return await response.json();
  };

 export const uploadOrderToCloud = async(order:any) =>{
  const response = await fetch('https://jsonplaceholder.typicode.com/posts',{
    method:'POST',
    headers:{
      Accept:'application/json',
      'Content-Type':'application/json',
    },
    body:JSON.stringify(order),
  });
  if (!response.ok) {
    throw new Error('Failed to upload order to cloud');
  }

  return await response.json();
 };
