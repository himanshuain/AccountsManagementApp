import { NextResponse } from 'next/server';
import { loadTransactions, saveTransactions } from '@/lib/blob-storage';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    
    let transactions = await loadTransactions() || [];
    
    if (supplierId) {
      transactions = transactions.filter(t => t.supplierId === supplierId);
    }
    
    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const transaction = await request.json();
    
    const transactions = await loadTransactions();
    const existingIndex = transactions.findIndex(t => t.id === transaction.id);
    
    if (existingIndex >= 0) {
      transactions[existingIndex] = transaction;
    } else {
      transactions.push(transaction);
    }
    
    await saveTransactions(transactions);
    
    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Failed to save transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    const transactions = await loadTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    await saveTransactions(filtered);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}

