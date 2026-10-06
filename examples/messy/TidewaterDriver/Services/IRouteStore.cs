using System.Collections.Generic;
using System.Threading.Tasks;

namespace TidewaterDriver.Services
{
    // Keeps the stops of the day on the device, so the route works without a signal.
    public interface IRouteStore
    {
        Task<IReadOnlyList<string>> LoadStopsAsync(string routeName);

        Task SaveDeliveredAsync(string parcelCode);
    }
}
