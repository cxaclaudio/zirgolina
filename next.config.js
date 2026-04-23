const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://zirgolina.pt/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;