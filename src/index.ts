import { serve } from "bun";
import index from "./index.html";

const IMAGES_DIR = "public/images";

async function serveStaticFile(req: Request, dir: string, prefix: string): Promise<Response> {
  const pathname = new URL(req.url).pathname;
  const relative = decodeURIComponent(pathname.slice(prefix.length));

  if (!relative || relative.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const file = Bun.file(`./${dir}/${relative}`);
  if (await file.exists()) {
    return new Response(file);
  }

  return new Response("Not found", { status: 404 });
}

const server = serve({
  routes: {
    "/images/*": (req) => serveStaticFile(req, IMAGES_DIR, "/images/"),
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
