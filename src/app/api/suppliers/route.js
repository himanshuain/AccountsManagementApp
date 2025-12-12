import { NextResponse } from 'next/server';
import { loadSuppliers, saveSuppliers } from '@/lib/blob-storage';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const suppliers = await loadSuppliers();
    return NextResponse.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Failed to load suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load suppliers' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supplier = await request.json();
    
    const suppliers = await loadSuppliers();
    const existingIndex = suppliers.findIndex(s => s.id === supplier.id);
    
    if (existingIndex >= 0) {
      suppliers[existingIndex] = supplier;
    } else {
      suppliers.push(supplier);
    }
    
    await saveSuppliers(suppliers);
    
    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Failed to save supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save supplier' },
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
        { success: false, error: 'Supplier ID is required' },
        { status: 400 }
      );
    }
    
    const suppliers = await loadSuppliers();
    const filtered = suppliers.filter(s => s.id !== id);
    await saveSuppliers(filtered);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}

