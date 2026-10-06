using TidewaterDriver.ViewModels;
using Xamarin.Forms;

namespace TidewaterDriver.Views
{
    public partial class DeliveryPage : ContentPage
    {
        public DeliveryPage()
        {
            InitializeComponent();
            BindingContext = new DeliveryViewModel();
            BackgroundColor = Color.FromHex("#F4F6F7");
        }
    }
}
