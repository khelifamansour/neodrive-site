export default function VideosPage() {
  const videos = [
    {
      title: "Présentation du véhicule",
      file: "/presentation.mp4",
    },
    {
      title: "Découverte de l'intérieur",
      file: "/interieur.mp4",
    },
    {
      title: "Essai sur route",
      file: "/essai-route.mp4",
    },
    {
      title: "Livraison chez le client",
      file: "/videos/client1.mp4",
    },
   
  ];

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Vidéos du véhicule
        </h1>

        <p className="text-gray-600 max-w-3xl mx-auto">
          Découvrez notre véhicule électrique sans permis à travers
          plusieurs vidéos de présentation, d'essais routiers et de
          témoignages clients.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {videos.map((video) => (
          <div
            key={video.file}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <video
              controls
              preload="metadata"
              className="w-full"
            >
              <source src={video.file} type="video/mp4" />
            </video>

            <div className="p-5">
              <h2 className="text-xl font-semibold">
                {video.title}
              </h2>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

