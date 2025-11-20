export default function CustomerDetailPage({ params }: { params: { id: string } }) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Customer Details</h1>
        <p>ID: {params.id}</p>
      </div>
    );
  }
  