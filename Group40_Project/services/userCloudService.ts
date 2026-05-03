import { BASE_URL } from "./productCloudService";

export const registerCloudUser = async (
  userName: string,
  role: string = "customer"
) => {
  const res = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, role }),
  });

  return await res.json();
};

export const loginCloudUser = async (
  userName: string,
  password: string
) => {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password }),
  });

  return await res.json();
};

export const getCloudUser = async (userName: string) => {
  const res = await fetch(`${BASE_URL}/users/${userName}`);
  return await res.json();
};

export const updateCloudUserAddress = async (
  userName: string,
  address: string
) => {
  const res = await fetch(`${BASE_URL}/users/${userName}/address`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  return await res.json();
};
export const updateCloudUserPassword = async (
  userName: string,
  password: string
) => {
  const res = await fetch(`${BASE_URL}/users/${userName}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  return await res.json();
};
export const deleteCloudUserAccount = async (userName: string) => {
  const cleanUserName = userName.trim().toLowerCase();

  const res = await fetch(`${BASE_URL}/users/${cleanUserName}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const text = await res.text();

  console.log('Delete cloud raw response:', text);

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      success: false,
      message: text || 'Server did not return JSON',
    };
  }
};