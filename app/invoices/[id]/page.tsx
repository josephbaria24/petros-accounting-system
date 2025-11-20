export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Invoice #{params.id}</h1>
        <p>Invoice details go here...</p>
      </div>
    );
  }
  