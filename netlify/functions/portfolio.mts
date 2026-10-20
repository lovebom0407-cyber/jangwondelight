import { handlePortfolio } from '../../server/portfolioGateway';
export default async (request: Request) => handlePortfolio(request);
