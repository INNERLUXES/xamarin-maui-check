using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using TidewaterDriver.Droid.Services;
using TidewaterDriver.Services;

[assembly: Xamarin.Forms.Dependency(typeof(AndroidRouteStore))]

namespace TidewaterDriver.Droid.Services
{
    public class AndroidRouteStore : IRouteStore
    {
        readonly string folder = Android.App.Application.Context.FilesDir.AbsolutePath;

        public Task<IReadOnlyList<string>> LoadStopsAsync(string routeName)
        {
            var path = Path.Combine(folder, routeName + ".txt");
            IReadOnlyList<string> stops = File.Exists(path) ? File.ReadAllLines(path) : new string[0];
            return Task.FromResult(stops);
        }

        public Task SaveDeliveredAsync(string parcelCode)
        {
            File.AppendAllText(Path.Combine(folder, "delivered.txt"), parcelCode + "\n");
            return Task.CompletedTask;
        }
    }
}
