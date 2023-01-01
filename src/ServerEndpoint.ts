import { FastifyReply, FastifyRequest } from "fastify";

export default abstract class ServerEndpoint {
    public async get(request: FastifyRequest, response: FastifyReply): Promise<any> {
        response.status(404);
        response.send({
            error: "not found"
        });
    }

    public async put(request: FastifyRequest, response: FastifyReply): Promise<any> {
        response.status(404);
        response.send({
            error: "not found"
        });
    }

    public async post(request: FastifyRequest, response: FastifyReply): Promise<any> {
        response.status(404);
        response.send({
            error: "not found"
        });
    }


    public async delete(request: FastifyRequest, response: FastifyReply): Promise<any> {
        response.status(404);
        response.send({
            error: "not found"
        });
    }

    public async options(request: FastifyRequest, response: FastifyReply): Promise<any> {
        response.status(404);
        response.send({
            error: "not found"
        });
    }
}