using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Windows.Input;
using TidewaterDriver.Services;
using Xamarin.Essentials;
using Xamarin.Forms;

namespace TidewaterDriver.ViewModels
{
    public class DeliveryViewModel : BindableObject
    {
        readonly IRouteStore store = DependencyService.Get<IRouteStore>();

        public DeliveryViewModel()
        {
            DeliverCommand = new Command(async () =>
            {
                await store.SaveDeliveredAsync(ParcelCode);
                MessagingCenter.Send(this, "ParcelDelivered", ParcelCode);
                Device.BeginInvokeOnMainThread(() => Stops.Remove(ParcelCode));
            });
            // MessagingCenter.Subscribe<DeliveryViewModel>(this, "Old", _ => { });
            Debug.WriteLine("resolved IRouteStore with DependencyService.Get");
            if (Device.RuntimePlatform == Device.iOS)
            {
                Preferences.Set("platform", "ios");
            }
        }

        public string RouteName { get; set; } = "Harbor loop";

        public string ParcelCode { get; set; }

        public ObservableCollection<string> Stops { get; } = new ObservableCollection<string>();

        public ICommand DeliverCommand { get; }
    }
}
